use crate::constants::{
  BLOB_DOWNLOAD_CHUNK_SIZE, S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE,
};
use crate::database::old::{BlobItem, ReverseIndexItem};
use crate::http::context::handle_s3_error;
use crate::tools::MemOps;
use crate::validate_identifier;

use super::{handle_db_error, AppContext};
use actix_web::error::{
  ErrorBadRequest, ErrorConflict, ErrorInternalServerError, ErrorNotFound,
  ErrorRangeNotSatisfiable,
};
use actix_web::{
  http::header::{ByteRangeSpec, Range},
  web, Error as HttpError, HttpResponse,
};
use anyhow::Result;
use async_stream::{try_stream, AsyncStream};
use serde::{Deserialize, Serialize};
use tokio_stream::StreamExt;
use tracing::{debug, error, info, instrument, trace, warn};
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
  ctx: web::Data<AppContext>,
  params: web::Path<String>,
  range_header: Option<web::Header<Range>>,
) -> actix_web::Result<HttpResponse> {
  info!("Get blob request");
  let blob_hash = params.into_inner();
  validate_identifier!(blob_hash);

  let s3_path = match ctx.db.find_blob_item(&blob_hash).await {
    Ok(Some(BlobItem { s3_path, .. })) => Ok(s3_path),
    Ok(None) => {
      debug!("Blob with given hash not found in database");
      Err(ErrorNotFound("blob not found"))
    }
    Err(err) => Err(handle_db_error(err)),
  }?;
  tracing::Span::current().record("s3_path", s3_path.to_full_path());

  let object_metadata = ctx
    .s3
    .get_object_metadata(&s3_path)
    .await
    .map_err(handle_s3_error)?;
  let file_size: u64 =
    object_metadata.content_length().try_into().map_err(|err| {
      error!("Failed to get S3 object content length: {:?}", err);
      ErrorInternalServerError("server error")
    })?;

  // Stream the data in chunks to avoid loading the whole file into memory.
  let chunk_size: u64 = BLOB_DOWNLOAD_CHUNK_SIZE;

  let s3 = ctx.s3.clone();

  let (range_start, range_end): (u64, u64) =
    parse_range_header(&range_header, file_size)?;

  let stream: AsyncStream<Result<web::Bytes, HttpError>, _> = try_stream! {
      debug!(?range_start, ?range_end, "Getting range of data");
      let mut offset: u64 = range_start;

      while offset < range_end {
        let next_size = std::cmp::min(chunk_size, range_end - offset + 1);
        let range = offset..(offset + next_size);
        trace!(?range, "Getting {} bytes of data", next_size);

        let data = s3.get_object_bytes(&s3_path, range).await.map_err(handle_s3_error)?;
        yield web::Bytes::from(data);

        offset += chunk_size;
      }
  };

  let content_length = (range_end - range_start + 1).to_string();

  if range_header.is_some() {
    return Ok(
      HttpResponse::PartialContent()
        .content_type("application/octet-stream")
        .append_header(("Content-Length", content_length))
        .append_header((
          "Content-Range",
          format!("bytes {}-{}/{}", range_start, range_end, file_size),
        ))
        .streaming(Box::pin(stream.in_current_span())),
    );
  }

  Ok(
    HttpResponse::Ok()
      .content_type("application/octet-stream")
      .append_header(("Content-Length", content_length))
      .streaming(Box::pin(stream.in_current_span())),
  )
}

#[derive(Deserialize, Debug)]
pub struct AssignHolderPayload {
  holder: String,
  blob_hash: String,
}

#[derive(Serialize)]
struct AssignHolderResponnse {
  data_exists: bool,
}

#[instrument(name = "assign_holder", skip(ctx))]
pub async fn assign_holder_handler(
  ctx: web::Data<AppContext>,
  payload: web::Json<AssignHolderPayload>,
) -> actix_web::Result<HttpResponse> {
  info!("Assign holder request");
  let AssignHolderPayload { holder, blob_hash } = payload.into_inner();
  validate_identifier!(holder);
  validate_identifier!(blob_hash);

  if ctx
    .db
    .find_reverse_index_by_holder(&holder)
    .await
    .map_err(handle_db_error)?
    .is_some()
  {
    warn!("holder already assigned");
    return Err(ErrorConflict("holder already assigned"));
  }

  let data_exists = ctx
    .db
    .find_blob_item(&blob_hash)
    .await
    .map_err(handle_db_error)?
    .is_some();
  debug!(data_exists, "Checked blob item existence");

  let reverse_index_item = ReverseIndexItem { holder, blob_hash };
  ctx
    .db
    .put_reverse_index_item(reverse_index_item)
    .await
    .map_err(handle_db_error)?;

  Ok(HttpResponse::Ok().json(web::Json(AssignHolderResponnse { data_exists })))
}

async fn get_blob_hash_field(
  multipart_payload: &mut actix_multipart::Multipart,
) -> Result<String, HttpError> {
  let Some(mut field) = multipart_payload.try_next().await? else {
    debug!("Malfolmed multipart request");
    return Err(ErrorBadRequest("Bad request"));
  };

  if field.name() != "blob_hash" {
    warn!("Blob hash is required as a first form field");
    return Err(ErrorBadRequest("Bad request"));
  }

  let mut buf = Vec::new();
  while let Some(chunk) = field.try_next().await? {
    buf.extend_from_slice(&chunk);
  }

  let blob_hash = String::from_utf8(buf)
    .map_err(|_| ErrorInternalServerError("Internal error"))?;

  validate_identifier!(blob_hash);
  return Ok(blob_hash);
}

async fn process_blob_data(
  multipart_payload: &mut actix_multipart::Multipart,
  upload_session: &mut crate::s3::MultiPartUploadSession,
) -> Result<(), HttpError> {
  let mut s3_chunk: Vec<u8> = Vec::new();
  while let Some(mut field) = multipart_payload.try_next().await? {
    let field_name = field.name();
    if field_name != "blob_data" {
      warn!(
        field_name,
        "Malfolmed request: 'blob_data' multipart field expected."
      );
      return Err(ErrorBadRequest("Bad request"));
    }

    while let Some(chunk) = field.try_next().await? {
      let mut chunk = chunk.to_vec();
      s3_chunk.append(&mut chunk);

      // New parts should be added to AWS only if they exceed minimum part size,
      // Otherwise AWS returns error
      if s3_chunk.len() as u64 > S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE {
        trace!(
          chunk_size = s3_chunk.len(),
          "Chunk size exceeded, adding new S3 part"
        );
        upload_session
          .add_part(s3_chunk.take_out())
          .await
          .map_err(handle_s3_error)?;
      }
    }
  }

  // add the remaining data as the last S3 part
  if !s3_chunk.is_empty() {
    upload_session
      .add_part(s3_chunk)
      .await
      .map_err(handle_s3_error)?;
  }

  Ok(())
}

#[instrument(skip_all, name = "upload_blob", fields(blob_hash))]
pub async fn upload_blob_handler(
  ctx: web::Data<AppContext>,
  mut payload: actix_multipart::Multipart,
) -> actix_web::Result<HttpResponse> {
  info!("Upload blob request");

  let blob_hash = get_blob_hash_field(&mut payload).await?;
  debug!("Received blob_hash: {}", &blob_hash);
  tracing::Span::current().record("blob_hash", &blob_hash);

  if ctx
    .db
    .find_blob_item(&blob_hash)
    .await
    .map_err(handle_db_error)?
    .is_some()
  {
    warn!("Blob with given hash already exists");
    return Err(ErrorConflict("Conflict"));
  }

  let blob_item = BlobItem::new(blob_hash);
  let mut upload_session = ctx
    .s3
    .start_upload_session(&blob_item.s3_path)
    .await
    .map_err(handle_s3_error)?;

  trace!("Receiving blob data");
  process_blob_data(&mut payload, &mut upload_session).await?;

  upload_session
    .finish_upload()
    .await
    .map_err(handle_s3_error)?;

  trace!("Upload finished, saving blob item to DB: {:?}", &blob_item);
  ctx
    .db
    .put_blob_item(blob_item)
    .await
    .map_err(handle_db_error)?;

  Ok(HttpResponse::NoContent().finish())
}

#[derive(Deserialize, Debug)]
pub struct RemoveHolderPayload {
  holder: String,
  blob_hash: String,
}

#[instrument(name = "remove_holder", skip(ctx))]
pub async fn remove_holder_handler(
  ctx: web::Data<AppContext>,
  payload: web::Json<RemoveHolderPayload>,
) -> actix_web::Result<HttpResponse> {
  info!("Remove holder request");
  let RemoveHolderPayload { holder, blob_hash } = payload.into_inner();
  validate_identifier!(holder);
  validate_identifier!(blob_hash);

  let reverse_index_item = ctx
    .db
    .find_reverse_index_by_holder(&holder)
    .await
    .map_err(handle_db_error)?
    .ok_or_else(|| {
      debug!("Blob not found");
      ErrorNotFound("Blob not found")
    })?;
  let blob_hash = &reverse_index_item.blob_hash;

  ctx
    .db
    .remove_reverse_index_item(&holder)
    .await
    .map_err(handle_db_error)?;

  // TODO: handle cleanup here properly
  // for now the object's being removed right away
  // after the last holder was removed
  if ctx
    .db
    .find_reverse_index_by_hash(blob_hash)
    .await
    .map_err(handle_db_error)?
    .is_empty()
  {
    let s3_path = ctx
      .find_s3_path_by_reverse_index(&reverse_index_item)
      .await?;
    debug!("Last holder removed. Deleting S3 object: {:?}", &s3_path);

    ctx
      .s3
      .delete_object(&s3_path)
      .await
      .map_err(handle_s3_error)?;

    ctx
      .db
      .remove_blob_item(blob_hash)
      .await
      .map_err(handle_db_error)?;
  } else {
    debug!("Blob still has holders, S3 object not deleted");
  }

  Ok(HttpResponse::NoContent().finish())
}
