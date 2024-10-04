use std::collections::HashSet;

use crate::http::errors::handle_blob_service_error;
use crate::service::BlobService;
use crate::validate_identifier;

use actix_web::error::{ErrorBadRequest, ErrorRangeNotSatisfiable};
use actix_web::web::Bytes;
use actix_web::{
  http::header::{ByteRangeSpec, Range},
  web, HttpResponse,
};
use async_stream::try_stream;
use base64::Engine;
use comm_lib::blob::types::http::{
  AssignHolderRequest, AssignHolderResponse, RemoveHolderRequest,
};
use comm_lib::http::multipart;
use tokio_stream::StreamExt;
use tracing::{debug, info, instrument, trace, warn};
use tracing_futures::Instrument;

/// Returns a tuple of first and last byte number (inclusive) represented by given range header.
fn parse_range_header(
  range_header: &Option<web::Header<Range>>,
  file_size: u64,
) -> actix_web::Result<(u64, u64)> {
  let (range_start, range_end): (u64, u64) = match range_header {
    Some(web::Header(Range::Bytes(ranges))) => {
      if ranges.len() > 1 {
        return Err(ErrorBadRequest("Multiple ranges not supported"));
      }

      match ranges[0] {
        ByteRangeSpec::FromTo(start, end) => {
          if end >= file_size || start > end {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (start, end)
        }
        ByteRangeSpec::From(start) => {
          if start >= file_size {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (start, file_size - 1)
        }
        ByteRangeSpec::Last(length) => {
          if length >= file_size {
            return Err(ErrorRangeNotSatisfiable("Range not satisfiable"));
          }
          (file_size - length, file_size - 1)
        }
      }
    }
    Some(web::Header(Range::Unregistered(..))) => {
      return Err(ErrorBadRequest("Use ranges registered at IANA"));
    }
    None => (0, file_size - 1),
  };

  Ok((range_start, range_end))
}

#[instrument(
  name = "get_blob",
  skip_all,
  fields(blob_hash = %params.as_ref().as_str(), s3_path))
]
pub async fn get_blob_handler(
  service: web::Data<BlobService>,
  params: web::Path<String>,
  range_header: Option<web::Header<Range>>,
) -> actix_web::Result<HttpResponse> {
  info!("Get blob request");
  let blob_hash = params.into_inner();
  validate_identifier!(blob_hash);

  trace!("Initializing download session");
  let mut download = service.create_download(blob_hash).await?;

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

  if range_header.is_some() {
    return Ok(
      HttpResponse::PartialContent()
        .content_type("application/octet-stream")
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
      .content_type("application/octet-stream")
      .append_header(("Content-Length", content_length))
      .streaming(Box::pin(stream)),
  )
}

#[instrument(name = "assign_holder", skip(service))]
pub async fn assign_holder_handler(
  service: web::Data<BlobService>,
  payload: web::Json<AssignHolderRequest>,
) -> actix_web::Result<HttpResponse> {
  info!("Assign holder request");
  let AssignHolderRequest { holder, blob_hash } = payload.into_inner();
  validate_identifier!(holder);
  validate_identifier!(blob_hash);

  let data_exists = service
    .find_existing_blobs(HashSet::from([&blob_hash]))
    .await?
    .contains(&blob_hash);

  service.assign_holder(blob_hash, holder).await?;

  let response = AssignHolderResponse { data_exists };
  Ok(HttpResponse::Ok().json(web::Json(response)))
}

#[instrument(skip_all, name = "upload_blob", fields(blob_hash))]
pub async fn upload_blob_handler(
  service: web::Data<BlobService>,
  mut payload: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  info!("Upload blob request");

  let Some((name, blob_hash)) = multipart::get_text_field(&mut payload).await?
  else {
    warn!("Malformed request: expected a field.");
    return Err(ErrorBadRequest("Bad request"));
  };

  if name != "blob_hash" {
    warn!(name, "Malformed request: 'blob_hash' text field expected.");
    return Err(ErrorBadRequest("Bad request"));
  }
  validate_identifier!(blob_hash);
  tracing::Span::current().record("blob_hash", &blob_hash);

  trace!("Receiving blob data");
  let stream = try_stream! {
    while let Some(mut field) = payload.try_next().await? {
      let field_name = field.name();

      if field_name == "base64_data" {
        trace!("Got base64_data");

        let mut buf = Vec::new();
        while let Some(chunk) = field.try_next().await? {
          buf.extend_from_slice(&chunk);
        }

        let base64_string = String::from_utf8(buf)
          .map_err(|err| actix_web::error::ParseError::Utf8(err.utf8_error()))?;

        let data = base64::engine::general_purpose::STANDARD
          .decode(&base64_string)
          .map_err(|err| {
            debug!("Invalid base64 payload: {err:?}");
            ErrorBadRequest("Invalid base64")
          })?;
        yield Bytes::from(data);
        return;
      }

      if field_name != "blob_data" {
        warn!(
          field_name,
          "Malformed request: 'blob_data' or 'base64_data' multipart field expected."
        );
        Err(ErrorBadRequest("Bad request"))?;
      }

      trace!("Got blob_data. Streaming...");
      while let Some(chunk) = field.try_next().await? {
        yield chunk;
      }
    }
    trace!("Stream done");
  };

  service.put_blob(blob_hash, stream).await?;
  Ok(HttpResponse::NoContent().finish())
}

#[instrument(name = "remove_holder", skip(service))]
pub async fn remove_holder_handler(
  service: web::Data<BlobService>,
  payload: web::Json<RemoveHolderRequest>,
) -> actix_web::Result<HttpResponse> {
  info!("Revoke holder request");
  let RemoveHolderRequest {
    holder,
    blob_hash,
    instant_delete,
  } = payload.into_inner();
  validate_identifier!(holder);
  validate_identifier!(blob_hash);

  service
    .revoke_holder(blob_hash, holder, instant_delete)
    .await?;
  Ok(HttpResponse::NoContent().finish())
}
