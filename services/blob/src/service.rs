use anyhow::{Context, Result};
use blob::blob_service_server::BlobService;
use chrono::Utc;
use std::{pin::Pin, sync::Arc};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream, StreamExt};
use tonic::{Request, Response, Status};

use crate::{
  constants::{
    BLOB_S3_BUCKET_NAME, GRPC_CHUNK_SIZE_LIMIT, GRPC_METADATA_SIZE_PER_MESSAGE,
    MPSC_CHANNEL_BUFFER_CAPACITY, S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE,
  },
  database::{self, BlobItem, DatabaseClient, ReverseIndexItem},
  s3::{MultiPartUploadSession, S3Path},
};

pub mod blob {
  tonic::include_proto!("blob");
}

pub struct MyBlobService {
  db: DatabaseClient,
  s3: Arc<aws_sdk_s3::Client>,
}

impl MyBlobService {
  pub fn new(db_client: DatabaseClient, s3_client: aws_sdk_s3::Client) -> Self {
    MyBlobService {
      db: db_client,
      s3: Arc::new(s3_client),
    }
  }

  async fn find_s3_path_by_reverse_index(
    &self,
    reverse_index_item: &ReverseIndexItem,
  ) -> Result<S3Path, Status> {
    let blob_hash = &reverse_index_item.blob_hash;
    match self.db.find_blob_item(&blob_hash).await {
      Ok(Some(BlobItem { s3_path, .. })) => Ok(s3_path),
      Ok(None) => Err(Status::not_found("blob not found")),
      Err(_) => Err(Status::aborted("internal error")),
    }
  }

  async fn find_s3_path_by_holder(
    &self,
    holder: &str,
  ) -> Result<S3Path, Status> {
    match self.db.find_reverse_index_by_holder(holder).await {
      Ok(Some(reverse_index)) => {
        self.find_s3_path_by_reverse_index(&reverse_index).await
      }
      Ok(None) => Err(Status::not_found("blob not found")),
      Err(_) => Err(Status::aborted("internal error")),
    }
  }
}

// gRPC implementation
#[tonic::async_trait]
impl BlobService for MyBlobService {
  type PutStream =
    Pin<Box<dyn Stream<Item = Result<blob::PutResponse, Status>> + Send>>;
  async fn put(
    &self,
    request: Request<tonic::Streaming<blob::PutRequest>>,
  ) -> Result<Response<Self::PutStream>, Status> {
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let db = self.db.clone();
    let s3 = self.s3.clone();
    tokio::spawn(async move {
      let mut put_handler = PutHandler::default();

      while let Some(message) = in_stream.next().await {
        let response = match message {
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::Holder(new_holder)),
          }) => put_handler.handle_holder(&db, new_holder).await,
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::BlobHash(new_hash)),
          }) => put_handler.handle_blob_hash(&db, new_hash).await,
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::DataChunk(new_data)),
          }) => put_handler.handle_data_chunk(&s3, new_data).await,
          _ => Err(Status::unknown("unknown error")),
        };
        if let Err(e) = tx.send(response).await {
          println!("Response was dropped: {}", e);
          break;
        }
        if put_handler.should_close_stream {
          break;
        }
      }

      if let Err(status) = put_handler.finish(&db).await {
        let _ = tx.send(Err(status)).await;
      }
    });

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::PutStream))
  }

  type GetStream =
    Pin<Box<dyn Stream<Item = Result<blob::GetResponse, Status>> + Send>>;
  async fn get(
    &self,
    request: Request<blob::GetRequest>,
  ) -> Result<Response<Self::GetStream>, Status> {
    let message: blob::GetRequest = request.into_inner();
    let s3_path = self.find_s3_path_by_holder(&message.holder).await?;

    let object_metadata = self
      .s3
      .head_object()
      .bucket(s3_path.bucket_name.clone())
      .key(s3_path.object_name.clone())
      .send()
      .await
      .map_err(|_| Status::aborted("server error"))?;

    let file_size: u64 = object_metadata.content_length().unsigned_abs();
    let chunk_size: u64 =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;

    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let s3 = self.s3.clone();

    tokio::spawn(async move {
      let mut offset: u64 = 0;
      while offset < file_size {
        let next_size = std::cmp::min(chunk_size, file_size - offset);
        let range = format!("bytes={}-{}", offset, offset + next_size - 1);

        let data = match s3
          .get_object()
          .bucket(&s3_path.bucket_name)
          .key(&s3_path.object_name)
          .range(range)
          .send()
          .await
          .context("Failed to retrieve object data")
        {
          Ok(part) => {
            part.body.collect().await.context("Failed to collect bytes")
          }
          Err(e) => Err(e),
        };

        let response = match data {
          Ok(data) => Ok(blob::GetResponse {
            data_chunk: data.into_bytes().to_vec(),
          }),
          Err(_) => Err(Status::aborted("download failed")),
        };

        let should_abort = response.is_err();
        if let Err(e) = tx.send(response).await {
          println!("Response was dropped: {}", e);
          break;
        }
        if should_abort {
          break;
        }

        offset += chunk_size;
      }
    });

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::GetStream))
  }

  async fn remove(
    &self,
    request: Request<blob::RemoveRequest>,
  ) -> Result<Response<()>, Status> {
    let message = request.into_inner();
    let holder = message.holder.as_str();
    let reverse_index_item = self
      .db
      .find_reverse_index_by_holder(holder)
      .await
      .map_err(|_| Status::aborted("Internal error"))?
      .ok_or_else(|| Status::not_found("Blob not found"))?;
    let blob_hash = &reverse_index_item.blob_hash;

    if self.db.remove_reverse_index_item(holder).await.is_err() {
      return Err(Status::aborted("Internal error"));
    }

    // TODO handle cleanup here properly
    // for now the object's being removed right away
    // after the last holder was removed
    if self
      .db
      .find_reverse_index_by_hash(blob_hash)
      .await
      .map_err(|_| Status::aborted("Internal error"))?
      .is_empty()
    {
      let s3_path = self
        .find_s3_path_by_reverse_index(&reverse_index_item)
        .await?;

      self
        .s3
        .delete_object()
        .bucket(&s3_path.bucket_name)
        .key(&s3_path.object_name)
        .send()
        .await
        .map_err(|_| Status::aborted("Internal error"))?;

      if self.db.remove_blob_item(blob_hash).await.is_err() {
        return Err(Status::aborted("Internal error"));
      }
    }

    Ok(Response::new(()))
  }
}

type PutResult = Result<blob::PutResponse, Status>;

enum PutAction {
  None,
  AssignHolder,
  UploadNewBlob(BlobItem),
}

/// A helper for handling Put RPC requests
struct PutHandler {
  /// Should the stream be closed by server
  pub should_close_stream: bool,
  action: PutAction,

  holder: Option<String>,
  blob_hash: Option<String>,
  current_chunk: Vec<u8>,

  uploader: Option<MultiPartUploadSession>,
}

impl Default for PutHandler {
  fn default() -> Self {
    PutHandler {
      should_close_stream: false,
      action: PutAction::None,
      holder: None,
      blob_hash: None,
      current_chunk: Vec::new(),
      uploader: None,
    }
  }
}

impl PutHandler {
  pub async fn handle_holder(
    &mut self,
    db: &DatabaseClient,
    new_holder: String,
  ) -> PutResult {
    if self.holder.is_some() {
      return Err(Status::invalid_argument("Holder already provided"));
    }
    self.holder = Some(new_holder);
    return self.determine_action(db).await;
  }

  pub async fn handle_blob_hash(
    &mut self,
    db: &DatabaseClient,
    new_hash: String,
  ) -> PutResult {
    if self.blob_hash.is_some() {
      return Err(Status::invalid_argument("Blob hash already provided"));
    }
    self.blob_hash = Some(new_hash);
    return self.determine_action(db).await;
  }

  /// private helper function to determine purpose of this RPC call
  async fn determine_action(&mut self, db: &DatabaseClient) -> PutResult {
    // this should be called only if action isn't determined yet
    // this error should actually never happen
    if !matches!(self.action, PutAction::None) {
      return Err(Status::failed_precondition("Put action is already started"));
    }

    // holder and hash need both to be set in order to continue
    // otherwise we send a standard response
    if self.holder.is_none() || self.blob_hash.is_none() {
      return Ok(blob::PutResponse { data_exists: false });
    }

    let blob_hash = self.blob_hash.as_ref().unwrap();
    return match db.find_blob_item(blob_hash).await {
      // Hash already exists, so we're only assigning a new holder to it
      Ok(Some(_)) => {
        self.action = PutAction::AssignHolder;
        self.should_close_stream = true;
        Ok(blob::PutResponse { data_exists: true })
      }
      // Hash doesn't exist, so we're starting a new upload session
      Ok(None) => {
        self.action = PutAction::UploadNewBlob(BlobItem {
          blob_hash: blob_hash.to_string(),
          s3_path: S3Path {
            bucket_name: BLOB_S3_BUCKET_NAME.to_string(),
            object_name: blob_hash.to_string(),
          },
          created: Utc::now(),
        });
        Ok(blob::PutResponse { data_exists: false })
      }
      Err(_db_err) => {
        self.should_close_stream = true;
        Err(Status::aborted("Internal error"))
      }
    };
  }

  pub async fn handle_data_chunk(
    &mut self,
    s3: &Arc<aws_sdk_s3::Client>,
    mut new_data: Vec<u8>,
  ) -> PutResult {
    let blob_item = match &self.action {
      PutAction::UploadNewBlob(blob_item) => blob_item,
      _ => {
        self.should_close_stream = true;
        return Err(Status::invalid_argument(
          "Holder and hash should be provided before data",
        ));
      }
    };

    // create upload session if it doesn't already exist
    if self.uploader.is_none() {
      self.uploader =
        match MultiPartUploadSession::start(s3, &blob_item.s3_path).await {
          Ok(session) => Some(session),
          Err(_) => {
            self.should_close_stream = true;
            return Err(Status::aborted("Internal error"));
          }
        }
    }
    let uploader = self.uploader.as_mut().unwrap();

    // New parts should be added to AWS only if they exceed minimum part size,
    // Otherwise AWS returns error
    self.current_chunk.append(&mut new_data);
    if self.current_chunk.len() as u64 > S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE
    {
      if uploader.add_part(self.current_chunk.clone()).await.is_err() {
        self.should_close_stream = true;
        return Err(Status::aborted("Internal error"));
      }
      self.current_chunk.clear();
    }

    Ok(blob::PutResponse { data_exists: false })
  }

  /// This consumes `self` so this put handler instance cannot be used after this is called.
  /// It should be called after the input stream is done
  pub async fn finish(self, db: &DatabaseClient) -> Result<(), Status> {
    let blob_item = match self.action {
      PutAction::None => return Ok(()),
      PutAction::AssignHolder => {
        return assign_holder_to_blob(
          db,
          self.holder.unwrap(),
          self.blob_hash.unwrap(),
        )
        .await;
      }
      PutAction::UploadNewBlob(blob_item) => blob_item,
    };

    let mut uploader =
      self.uploader.ok_or(Status::aborted("Internal error"))?;

    if !self.current_chunk.is_empty() {
      if uploader.add_part(self.current_chunk).await.is_err() {
        return Err(Status::aborted("Internal error"));
      }
    }

    if uploader.finish_upload().await.is_err() {
      return Err(Status::aborted("Internal error"));
    }

    if db.put_blob_item(blob_item).await.is_err() {
      return Err(Status::aborted("Internal error"));
    }

    assign_holder_to_blob(db, self.holder.unwrap(), self.blob_hash.unwrap())
      .await
  }
}

async fn assign_holder_to_blob(
  db: &DatabaseClient,
  holder: String,
  blob_hash: String,
) -> Result<(), Status> {
  let reverse_index_item = database::ReverseIndexItem { holder, blob_hash };

  if db.put_reverse_index_item(reverse_index_item).await.is_err() {
    return Err(Status::aborted("Internal error"));
  }
  Ok(())
}
