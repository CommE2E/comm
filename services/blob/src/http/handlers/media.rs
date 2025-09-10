use crate::database::types::MediaInfo;
use crate::http::errors::handle_blob_service_error;
use crate::http::utils::parse_range_header;
use crate::service::BlobService;

use actix_web::error::ErrorBadRequest;
use actix_web::{http::header::Range, web, HttpResponse};
use async_stream::try_stream;
use comm_lib::blob::types::http::BlobUploadMultimediaResponse;
use comm_lib::blob::types::BlobInfo;
use comm_lib::http::multipart;
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

fn validate_media_id(media_id: &str) -> Result<(), actix_web::Error> {
  if comm_lib::tools::is_valid_identifier(media_id) {
    return Ok(());
  }

  if let Ok(decoded_url) = urlencoding::decode(media_id) {
    if decoded_url.parse::<http::Uri>().is_ok_and(|uri| {
      // TODO: maybe additional validation here
      uri.scheme().is_some_and(|scheme| {
        *scheme == Scheme::HTTP || *scheme == Scheme::HTTPS
      })
    }) {
      return Ok(());
    }
  }

  Err(ErrorBadRequest("bad request"))
}
