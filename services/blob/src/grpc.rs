use anyhow::Result;
use aws_sdk_dynamodb::Error as DynamoDBError;
use blob::blob_service_server::BlobService;
use std::{net::SocketAddr, pin::Pin};
use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream, StreamExt};
use tonic::{transport::Server, Request, Response, Status};
use tracing::{debug, error, info, instrument, trace, warn, Instrument};

use crate::{
  config::CONFIG,
  constants::{
    GRPC_CHUNK_SIZE_LIMIT, GRPC_METADATA_SIZE_PER_MESSAGE,
    MPSC_CHANNEL_BUFFER_CAPACITY, S3_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE,
  },
  database::{BlobItem, DatabaseClient, Error as DBError, ReverseIndexItem},
  s3::{MultiPartUploadSession, S3Client, S3Path},
  tools::MemOps,
};

mod blob {
  tonic::include_proto!("blob");
}
use blob::blob_service_server::BlobServiceServer;

pub async fn run_grpc_server(
  db_client: DatabaseClient,
  s3_client: S3Client,
) -> Result<()> {
  let addr: SocketAddr = format!("[::]:{}", CONFIG.grpc_port).parse()?;
  let blob_service = MyBlobService::new(db_client, s3_client);

  info!("Starting gRPC server listening at {}", CONFIG.grpc_port);
  Server::builder()
    .add_service(BlobServiceServer::new(blob_service))
    .serve(addr)
    .await?;

  Ok(())
}

struct MyBlobService {
  db: DatabaseClient,
  s3: S3Client,
}

impl MyBlobService {
  pub fn new(db_client: DatabaseClient, s3_client: S3Client) -> Self {
    MyBlobService {
      db: db_client,
      s3: s3_client,
    }
  }

  async fn find_s3_path_by_reverse_index(
    &self,
    reverse_index_item: &ReverseIndexItem,
  ) -> Result<S3Path, Status> {
    let blob_hash = &reverse_index_item.blob_hash;
    match self.db.find_blob_item(&blob_hash).await {
      Ok(Some(BlobItem { s3_path, .. })) => Ok(s3_path),
      Ok(None) => {
        debug!("No blob found for {:?}", reverse_index_item);
        Err(Status::not_found("blob not found"))
      }
      Err(err) => Err(handle_db_error(err)),
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
      Ok(None) => {
        debug!("No db entry found for holder {:?}", holder);
        Err(Status::not_found("blob not found"))
      }
      Err(err) => Err(handle_db_error(err)),
    }
  }
}

// gRPC implementation
#[tonic::async_trait]
impl BlobService for MyBlobService {
  type PutStream =
    Pin<Box<dyn Stream<Item = Result<blob::PutResponse, Status>> + Send>>;

  #[instrument(skip_all, fields(holder))]
  async fn put(
    &self,
    request: Request<tonic::Streaming<blob::PutRequest>>,
  ) -> Result<Response<Self::PutStream>, Status> {
    info!("Put blob request: {:?}", request);
    let mut in_stream = request.into_inner();
    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let db = self.db.clone();
    let s3 = self.s3.clone();
    let worker = async move {
      let mut put_handler = PutHandler::new(&db, &s3);

      while let Some(message) = in_stream.next().await {
        let response = match message {
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::Holder(new_holder)),
          }) => put_handler.handle_holder(new_holder).await,
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::BlobHash(new_hash)),
          }) => put_handler.handle_blob_hash(new_hash).await,
          Ok(blob::PutRequest {
            data: Some(blob::put_request::Data::DataChunk(new_data)),
          }) => put_handler.handle_data_chunk(new_data).await,
          unexpected => {
            error!("Received an unexpected Result: {:?}", unexpected);
            Err(Status::unknown("unknown error"))
          }
        };
        trace!("Sending response: {:?}", response);
        if let Err(e) = tx.send(response).await {
          error!("Response was dropped: {}", e);
          break;
        }
        if put_handler.should_close_stream {
          trace!("Put handler requested to close stream");
          break;
        }
      }

      if let Err(status) = put_handler.finish().await {
        trace!("Sending error response: {:?}", status);
        let _ = tx.send(Err(status)).await;
      }
    };
    tokio::spawn(worker.in_current_span());

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::PutStream))
  }

  type GetStream =
    Pin<Box<dyn Stream<Item = Result<blob::GetResponse, Status>> + Send>>;

  #[instrument(skip_all, fields(holder = %request.get_ref().holder, s3_path))]
  async fn get(
    &self,
    request: Request<blob::GetRequest>,
  ) -> Result<Response<Self::GetStream>, Status> {
    info!("Get blob request: {:?}", request);
    let message: blob::GetRequest = request.into_inner();
    let s3_path = self.find_s3_path_by_holder(&message.holder).await?;
    tracing::Span::current().record("s3_path", s3_path.to_full_path());

    let object_metadata =
      self.s3.get_object_metadata(&s3_path).await.map_err(|err| {
        error!("Failed to get S3 object metadata: {:?}", err);
        Status::aborted("server error")
      })?;

    let file_size: u64 =
      object_metadata.content_length().try_into().map_err(|err| {
        error!("Failed to get S3 object content length: {:?}", err);
        Status::aborted("server error")
      })?;
    let chunk_size: u64 =
      GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE;

    let (tx, rx) = mpsc::channel(MPSC_CHANNEL_BUFFER_CAPACITY);
    let s3 = self.s3.clone();

    let worker = async move {
      let mut offset: u64 = 0;
      while offset < file_size {
        let next_size = std::cmp::min(chunk_size, file_size - offset);
        let range = offset..(offset + next_size);
        trace!(?range, "Getting {} bytes of data", next_size);

        let response = match s3.get_object_bytes(&s3_path, range).await {
          Ok(data) => Ok(blob::GetResponse { data_chunk: data }),
          Err(err) => {
            error!("Failed to download data chunk: {:?}", err);
            Err(Status::aborted("download failed"))
          }
        };

        let should_abort = response.is_err();
        if let Err(e) = tx.send(response).await {
          error!("Response was dropped: {}", e);
          break;
        }
        if should_abort {
          trace!("Error response, aborting");
          break;
        }

        offset += chunk_size;
      }
    };
    tokio::spawn(worker.in_current_span());

    let out_stream = ReceiverStream::new(rx);
    Ok(Response::new(Box::pin(out_stream) as Self::GetStream))
  }

  #[instrument(skip_all, fields(holder = %request.get_ref().holder))]
  async fn remove(
    &self,
    request: Request<blob::RemoveRequest>,
  ) -> Result<Response<()>, Status> {
    info!("Remove blob request: {:?}", request);
    let message = request.into_inner();
    let holder = message.holder.as_str();
    let reverse_index_item = self
      .db
      .find_reverse_index_by_holder(holder)
      .await
      .map_err(handle_db_error)?
      .ok_or_else(|| {
        debug!("Blob not found");
        Status::not_found("Blob not found")
      })?;
    let blob_hash = &reverse_index_item.blob_hash;

    self
      .db
      .remove_reverse_index_item(holder)
      .await
      .map_err(handle_db_error)?;

    // TODO handle cleanup here properly
    // for now the object's being removed right away
    // after the last holder was removed
    if self
      .db
      .find_reverse_index_by_hash(blob_hash)
      .await
      .map_err(handle_db_error)?
      .is_empty()
    {
      let s3_path = self
        .find_s3_path_by_reverse_index(&reverse_index_item)
        .await?;

      self.s3.delete_object(&s3_path).await.map_err(|err| {
        error!("Failed to delete S3 object: {:?}", err);
        Status::aborted("Internal error")
      })?;

      self
        .db
        .remove_blob_item(blob_hash)
        .await
        .map_err(handle_db_error)?;
    }

    Ok(Response::new(()))
  }
}

type PutResult = Result<blob::PutResponse, Status>;

enum PutAction {
  AssignHolder,
  UploadNewBlob(BlobItem),
}

/// A helper for handling Put RPC requests
struct PutHandler {
  /// Should the stream be closed by server
  pub should_close_stream: bool,
  action: Option<PutAction>,

  holder: Option<String>,
  blob_hash: Option<String>,
  current_chunk: Vec<u8>,

  uploader: Option<MultiPartUploadSession>,
  db: DatabaseClient,
  s3: S3Client,
}

impl PutHandler {
  fn new(db: &DatabaseClient, s3: &S3Client) -> Self {
    PutHandler {
      should_close_stream: false,
      action: None,
      holder: None,
      blob_hash: None,
      current_chunk: Vec::new(),
      uploader: None,
      db: db.clone(),
      s3: s3.clone(),
    }
  }

  pub async fn handle_holder(&mut self, new_holder: String) -> PutResult {
    if self.holder.is_some() {
      warn!("Holder already provided");
      return Err(Status::invalid_argument("Holder already provided"));
    }
    tracing::Span::current().record("holder", &new_holder);
    self.holder = Some(new_holder);
    self.determine_action().await
  }

  pub async fn handle_blob_hash(&mut self, new_hash: String) -> PutResult {
    if self.blob_hash.is_some() {
      warn!("Blob hash already provided");
      return Err(Status::invalid_argument("Blob hash already provided"));
    }
    debug!("Blob hash: {}", new_hash);
    self.blob_hash = Some(new_hash);
    self.determine_action().await
  }

  /// private helper function to determine purpose of this RPC call
  async fn determine_action(&mut self) -> PutResult {
    // this should be called only if action isn't determined yet
    // this error should actually never happen
    if self.action.is_some() {
      error!("Put action is already started");
      return Err(Status::failed_precondition("Put action is already started"));
    }

    // holder and hash need both to be set in order to continue
    // otherwise we send a standard response
    if self.holder.is_none() || self.blob_hash.is_none() {
      return Ok(blob::PutResponse { data_exists: false });
    }
    let blob_hash = self
      .blob_hash
      .as_ref()
      .ok_or_else(|| Status::failed_precondition("Internal error"))?;

    match self.db.find_blob_item(blob_hash).await {
      // Hash already exists, so we're only assigning a new holder to it
      Ok(Some(_)) => {
        debug!("Blob found, assigning holder");
        self.action = Some(PutAction::AssignHolder);
        self.should_close_stream = true;
        Ok(blob::PutResponse { data_exists: true })
      }
      // Hash doesn't exist, so we're starting a new upload session
      Ok(None) => {
        debug!("Blob not found, starting upload action");
        self.action = Some(PutAction::UploadNewBlob(BlobItem::new(blob_hash)));
        Ok(blob::PutResponse { data_exists: false })
      }
      Err(db_err) => {
        self.should_close_stream = true;
        Err(handle_db_error(db_err))
      }
    }
  }

  pub async fn handle_data_chunk(
    &mut self,
    mut new_data: Vec<u8>,
  ) -> PutResult {
    let blob_item = match &self.action {
      Some(PutAction::UploadNewBlob(blob_item)) => blob_item,
      _ => {
        self.should_close_stream = true;
        error!("Data chunk sent before upload action is started");
        return Err(Status::invalid_argument(
          "Holder and hash should be provided before data",
        ));
      }
    };
    trace!("Received {} bytes of data", new_data.len());

    // create upload session if it doesn't already exist
    if self.uploader.is_none() {
      debug!("Uploader doesn't exist, starting new session");
      self.uploader =
        match self.s3.start_upload_session(&blob_item.s3_path).await {
          Ok(session) => Some(session),
          Err(err) => {
            self.should_close_stream = true;
            error!("Failed to create upload session: {:?}", err);
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
      trace!("Chunk size exceeded, adding new S3 part");
      if let Err(err) = uploader.add_part(self.current_chunk.take_out()).await {
        self.should_close_stream = true;
        error!("Failed to upload S3 part: {:?}", err);
        return Err(Status::aborted("Internal error"));
      }
    }

    Ok(blob::PutResponse { data_exists: false })
  }

  /// This function should be called after the input stream is finished.
  /// This consumes `self` so this put handler instance cannot be used
  /// after this is called.
  pub async fn finish(self) -> Result<(), Status> {
    if self.action.is_none() {
      debug!("No action to perform, finishing now");
      return Ok(());
    }
    let holder = self.holder.ok_or_else(|| {
      error!("Cannot finish action. No holder provided!");
      Status::aborted("Internal error")
    })?;
    let blob_hash = self.blob_hash.ok_or_else(|| {
      error!("Cannot finish action. No blob hash provided!");
      Status::aborted("Internal error")
    })?;
    let blob_item = match self.action {
      None => return Ok(()),
      Some(PutAction::AssignHolder) => {
        return assign_holder_to_blob(&self.db, holder, blob_hash).await;
      }
      Some(PutAction::UploadNewBlob(blob_item)) => blob_item,
    };

    let mut uploader = self.uploader.ok_or_else(|| {
      // This also happens when client cancels before sending any data chunk
      warn!("No uploader was created, finishing now");
      Status::aborted("Internal error")
    })?;

    if !self.current_chunk.is_empty() {
      if let Err(err) = uploader.add_part(self.current_chunk).await {
        error!("Failed to upload final part: {:?}", err);
        return Err(Status::aborted("Internal error"));
      }
    }

    if let Err(err) = uploader.finish_upload().await {
      error!("Failed to finish upload session: {:?}", err);
      return Err(Status::aborted("Internal error"));
    }

    self
      .db
      .put_blob_item(blob_item)
      .await
      .map_err(handle_db_error)?;

    assign_holder_to_blob(&self.db, holder, blob_hash).await?;

    debug!("Upload finished successfully");
    Ok(())
  }
}

async fn assign_holder_to_blob(
  db: &DatabaseClient,
  holder: String,
  blob_hash: String,
) -> Result<(), Status> {
  let reverse_index_item = ReverseIndexItem { holder, blob_hash };

  db.put_reverse_index_item(reverse_index_item)
    .await
    .map_err(handle_db_error)
}

fn handle_db_error(db_error: DBError) -> Status {
  match db_error {
    DBError::AwsSdk(DynamoDBError::InternalServerError(_))
    | DBError::AwsSdk(DynamoDBError::ProvisionedThroughputExceededException(
      _,
    ))
    | DBError::AwsSdk(DynamoDBError::RequestLimitExceeded(_)) => {
      warn!("AWS transient error occurred");
      Status::unavailable("please retry")
    }
    DBError::Blob(e) => {
      error!("Encountered Blob database error: {}", e);
      Status::failed_precondition("Internal error")
    }
    e => {
      error!("Encountered an unexpected error: {}", e);
      Status::failed_precondition("unexpected error")
    }
  }
}
