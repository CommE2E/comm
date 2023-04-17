use crate::constants::BLOB_DOWNLOAD_CHUNK_SIZE;

use super::{handle_db_error, AppContext};
use actix_web::error::{ErrorInternalServerError, ErrorNotFound};
use actix_web::{web, Error as HttpError, HttpResponse};
use anyhow::Result;
use async_stream::{try_stream, AsyncStream};
use tracing::{debug, error, info, instrument, trace};
use tracing_futures::Instrument;

#[instrument(
  name = "get_blob",
  skip_all,
  fields(holder = %params.as_ref().as_str(), s3_path))
]
pub async fn get_blob_handler(
  ctx: web::Data<AppContext>,
  params: web::Path<String>,
) -> actix_web::Result<HttpResponse> {
  info!("Get blob request");
  let holder = params.into_inner();
  let s3_path = ctx.find_s3_path_by_holder(&holder).await?;
  tracing::Span::current().record("s3_path", s3_path.to_full_path());

  let object_metadata =
    ctx.s3.get_object_metadata(&s3_path).await.map_err(|err| {
      error!("Failed to get S3 object metadata: {:?}", err);
      ErrorInternalServerError("server error")
    })?;
  let file_size: u64 =
    object_metadata.content_length().try_into().map_err(|err| {
      error!("Failed to get S3 object content length: {:?}", err);
      ErrorInternalServerError("server error")
    })?;

  // Stream the data in chunks to avoid loading the whole file into memory.
  let chunk_size: u64 = BLOB_DOWNLOAD_CHUNK_SIZE;

  let s3 = ctx.s3.clone();

  let stream: AsyncStream<Result<web::Bytes, HttpError>, _> = try_stream! {
    let mut offset: u64 = 0;
    while offset < file_size {
      let next_size = std::cmp::min(chunk_size, file_size - offset);
      let range = offset..(offset + next_size);
      trace!(?range, "Getting {} bytes of data", next_size);

      let data = s3.get_object_bytes(&s3_path, range).await.map_err(|err| {
        error!("Failed to download data chunk: {:?}", err);
        ErrorInternalServerError("download failed")
      })?;
      yield web::Bytes::from(data);

      offset += chunk_size;
    }
  };

  Ok(
    HttpResponse::Ok()
      .content_type("application/octet-stream")
      .streaming(Box::pin(stream.in_current_span())),
  )
}

#[instrument(
  name = "delete_blob",
  skip_all,
  fields(holder = %params.as_ref().as_str()))
]
pub async fn delete_blob_handler(
  ctx: web::Data<AppContext>,
  params: web::Path<String>,
) -> actix_web::Result<HttpResponse> {
  info!("Delete blob request");
  let holder = params.into_inner();
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

    ctx.s3.delete_object(&s3_path).await.map_err(|e| {
      error!("Failed to delete S3 object: {:?}", e);
      ErrorInternalServerError("server error")
    })?;

    ctx
      .db
      .remove_blob_item(blob_hash)
      .await
      .map_err(handle_db_error)?;
  }

  Ok(HttpResponse::NoContent().finish())
}
