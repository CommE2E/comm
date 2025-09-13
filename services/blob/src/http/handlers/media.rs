use crate::database::types::MediaInfo;
use crate::http::errors::handle_blob_service_error;
use crate::http::utils::parse_range_header;
use crate::service::BlobService;

use actix_web::error::{ErrorBadRequest, ErrorServiceUnavailable};
use actix_web::{http::header::Range, web, HttpResponse};
use async_stream::try_stream;
use comm_lib::blob::types::http::{
  BlobUploadMultimediaResponse, MirrorMultimediaRequest, MirroredMediaInfo,
};
use comm_lib::blob::types::BlobInfo;
use comm_lib::http::multipart;
use http::header::CONTENT_TYPE;
use http::uri::Scheme;
use tokio_stream::StreamExt;
use tracing::{info, instrument, trace, warn};
use tracing_futures::Instrument;

#[instrument(
  name = "get_media",
  skip_all,
  fields(media_id = %params.as_ref().as_str(), s3_path))
]
pub async fn get_media_handler(
  service: web::Data<BlobService>,
  params: web::Path<String>,
  range_header: Option<web::Header<Range>>,
) -> actix_web::Result<HttpResponse> {
  info!("Get media request");
  let media_id = params.into_inner();
  validate_media_id(&media_id)?;

  trace!("Initializing download session");
  let (mut download, media_info) =
    service.create_media_download(&media_id).await?;

  let total_size = download.blob_size;
  let (range_start, range_end): (u64, u64) =
    parse_range_header(&range_header, total_size)?;
  download.set_byte_range(range_start..=range_end);
  let content_length = download.download_size();

  let stream = download
    .into_stream()
    .map(|data| match data {
      Ok(bytes) => Ok(web::Bytes::from(bytes)),
      Err(err) => {
        warn!("Error during download stream: {:?}", err);
        Err(handle_blob_service_error(&err))
      }
    })
    .in_current_span();

  let content_type = media_info
    .content_type
    .as_deref()
    .unwrap_or("application/octet-stream");

  if range_header.is_some() {
    return Ok(
      HttpResponse::PartialContent()
        .content_type(content_type)
        .append_header(("Content-Length", content_length))
        .append_header((
          "Content-Range",
          format!("bytes {}-{}/{}", range_start, range_end, total_size),
        ))
        .streaming(Box::pin(stream)),
    );
  }

  Ok(
    HttpResponse::Ok()
      .content_type(content_type)
      .append_header(("Content-Length", content_length))
      .streaming(Box::pin(stream)),
  )
}

#[instrument(skip_all, name = "upload_media", fields(blob_hash))]
pub async fn upload_media_handler(
  service: web::Data<BlobService>,
  mut payload: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  info!("Upload media request");

  let mut mime_type = None;
  let mut metadata = None;

  let mut file_field = loop {
    let Some(field) = payload.try_next().await? else {
      return Err(ErrorBadRequest("Bad request"));
    };

    match field.name() {
      "mime_type" => {
        let mime = multipart::read_field_to_string(field).await?;
        mime_type = Some(mime);
      }
      "metadata" => {
        let metadata_value = multipart::read_field_to_string(field).await?;
        metadata = Some(metadata_value);
      }
      "file" => break field,
      unknown => {
        warn!("Unknown field: {}. Ignoring", unknown);
        continue;
      }
    };
  };

  let media_id = uuid::Uuid::new_v4().to_string();

  let content_type = mime_type.or_else(|| {
    file_field
      .content_type()
      .cloned()
      .map(|ct| ct.essence_str().to_string())
  });

  let stream = try_stream! {
    trace!("Got media contents. Streaming...");
    while let Some(chunk) = file_field.try_next().await? {
      yield chunk;
    }
    trace!("Stream done");
  };

  let media_info = MediaInfo {
    content_type: content_type.clone(),
    custom_metadata: metadata.clone(),
  };

  // create a blob hash based off media ID
  let blob_info = BlobInfo::from_bytes(media_id.as_bytes());
  service
    .put_blob(&blob_info.blob_hash, Some(media_info), stream)
    .await?;
  service
    .assign_holder_with_tags(
      &blob_info.blob_hash,
      &blob_info.holder,
      &["media".to_string()],
    )
    .await?;
  tracing::debug!(media_id, "Stored blob: {:?}.", blob_info);

  let response = BlobUploadMultimediaResponse {
    media_id,
    blob_hash: blob_info.blob_hash,
    content_type,
    metadata,
  };
  Ok(HttpResponse::Created().json(response))
}

#[instrument(skip_all, name = "mirror_media")]
pub async fn mirror_media(
  service: web::Data<BlobService>,
  payload: web::Json<MirrorMultimediaRequest>,
) -> actix_web::Result<HttpResponse> {
  let MirrorMultimediaRequest { medias } = payload.into_inner();
  info!("Mirror multimedia request for {} medias", medias.len());

  let media_blob_infos: Vec<(MirroredMediaInfo, BlobInfo)> = medias
    .into_iter()
    .map(|media| {
      let blob_info = BlobInfo::from_bytes(media.url.as_bytes());
      (media, blob_info)
    })
    .collect();

  let blob_hashes = media_blob_infos
    .iter()
    .map(|(_, info)| &info.blob_hash)
    .collect();
  let already_existing = service.find_existing_blobs(blob_hashes).await?;
  tracing::debug!("Found {} already mirrored media.", already_existing.len());

  let new_media = media_blob_infos
    .into_iter()
    .filter(|(_, blob_info)| !already_existing.contains(&blob_info.blob_hash));

  let mut cnt = 0;
  for (media, blob_info) in new_media {
    trace!("Mirroring '{}'", &media.url);

    let response = reqwest::get(&media.url).await.map_err(|err| {
      tracing::error!("Fetching media failed: {err:?}");
      ErrorServiceUnavailable("media_unavailable")
    })?;

    let content_type = response
      .headers()
      .get(CONTENT_TYPE)
      .cloned()
      .and_then(|value| value.to_str().map(String::from).ok());
    trace!("Found content type: {:?}", content_type);

    let custom_metadata = serde_json::json!({
        "originalUrl": media.url,
        "originalMediaMetadata": media.original_metadata,
    });
    let media_info = MediaInfo {
      content_type: content_type.clone(),
      custom_metadata: Some(serde_json::to_string(&custom_metadata).unwrap()),
    };

    trace!(?media_info, ?blob_info, "Creating blob and holder.");

    let mut stream = response.bytes_stream();
    let stream = try_stream! {
      while let Some(chunk) = stream.try_next().await? {
        yield chunk;
      }
    };
    service
      .put_blob(&blob_info.blob_hash, Some(media_info), stream)
      .await?;
    service
      .assign_holder_with_tags(
        &blob_info.blob_hash,
        &blob_info.holder,
        &["media".to_string(), "mirrored".to_string()],
      )
      .await?;

    tracing::debug!(
      ?blob_info,
      ?content_type,
      "Mirror success for '{}'.",
      &media.url
    );
    cnt += 1;
  }

  info!("Successfully mirrored {} multimedia.", cnt);
  Ok(HttpResponse::Ok().finish())
}

fn validate_media_id(media_id: &str) -> Result<(), actix_web::Error> {
  if comm_lib::tools::is_valid_identifier(media_id) {
    return Ok(());
  }

  if let Ok(decoded_url) = urlencoding::decode(media_id) {
    if decoded_url.parse::<http::Uri>().is_ok_and(|uri| {
      uri.scheme().is_some_and(|scheme| {
        *scheme == Scheme::HTTP || *scheme == Scheme::HTTPS
      })
    }) {
      return Ok(());
    }
  }

  Err(ErrorBadRequest("bad request"))
}
