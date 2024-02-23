use crate::constants::WS_FRAME_SIZE;
use crate::database::{log_item::LogItem, DatabaseClient};
use actix::{Actor, ActorContext, ActorFutureExt, AsyncContext, StreamHandler};
use actix_http::ws::{CloseCode, Item};
use actix_web::{
  web::{self, Bytes, BytesMut},
  Error, HttpRequest, HttpResponse,
};
use actix_web_actors::ws::{self, WebsocketContext};
use comm_lib::auth::UserIdentity;
use comm_lib::{
  backup::{
    DownloadLogsRequest, LogWSRequest, LogWSResponse, UploadLogRequest,
  },
  blob::{
    client::{BlobServiceClient, BlobServiceError},
    types::BlobInfo,
  },
  database::{self, blob::BlobOrDBContent},
};
use std::time::{Duration, Instant};
use tracing::{error, info, instrument, warn};

pub async fn handle_ws(
  req: HttpRequest,
  user: UserIdentity,
  stream: web::Payload,
  blob_client: web::Data<BlobServiceClient>,
  db_client: web::Data<DatabaseClient>,
) -> Result<HttpResponse, Error> {
  ws::WsResponseBuilder::new(
    LogWSActor {
      user,
      blob_client: blob_client.as_ref().clone(),
      db_client: db_client.as_ref().clone(),
      last_msg_time: Instant::now(),
      buffer: BytesMut::new(),
    },
    &req,
    stream,
  )
  .frame_size(WS_FRAME_SIZE)
  .start()
}

#[derive(
  Debug, derive_more::From, derive_more::Display, derive_more::Error,
)]
enum LogWSError {
  Bincode(bincode::Error),
  Blob(BlobServiceError),
  DB(database::Error),
}

struct LogWSActor {
  user: UserIdentity,
  blob_client: BlobServiceClient,
  db_client: DatabaseClient,

  last_msg_time: Instant,
  buffer: BytesMut,
}

impl LogWSActor {
  const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
  const CONNECTION_TIMEOUT: Duration = Duration::from_secs(10);

  fn handle_msg_sync(
    &self,
    ctx: &mut WebsocketContext<LogWSActor>,
    bytes: Bytes,
  ) {
    let fut = Self::handle_msg(
      self.user.user_id.clone(),
      self.blob_client.clone(),
      self.db_client.clone(),
      bytes,
    );

    let fut = actix::fut::wrap_future(fut).map(
      |responses,
       _: &mut LogWSActor,
       ctx: &mut WebsocketContext<LogWSActor>| {
        let responses = match responses {
          Ok(responses) => responses,
          Err(err) => {
            error!("Error: {err:?}");
            vec![LogWSResponse::ServerError]
          }
        };

        for response in responses {
          match bincode::serialize(&response) {
            Ok(bytes) => ctx.binary(bytes),
            Err(error) => {
              error!(
                "Error serializing a response: {response:?}. Error: {error}"
              );
            }
          };
        }
      },
    );

    ctx.spawn(fut);
  }

  async fn handle_msg(
    user_id: String,
    blob_client: BlobServiceClient,
    db_client: DatabaseClient,
    bytes: Bytes,
  ) -> Result<Vec<LogWSResponse>, LogWSError> {
    let request = bincode::deserialize(&bytes)?;

    match request {
      LogWSRequest::UploadLog(UploadLogRequest {
        backup_id,
        log_id,
        content,
        attachments,
      }) => {
        let mut attachment_blob_infos = Vec::new();

        for attachment in attachments.unwrap_or_default() {
          let blob_info =
            Self::create_attachment(&blob_client, attachment).await?;

          attachment_blob_infos.push(blob_info);
        }

        let mut log_item = LogItem {
          user_id,
          backup_id: backup_id.clone(),
          log_id,
          content: BlobOrDBContent::new(content),
          attachments: attachment_blob_infos,
        };

        log_item.ensure_size_constraints(&blob_client).await?;
        db_client.put_log_item(log_item).await?;

        Ok(vec![LogWSResponse::LogUploaded { backup_id, log_id }])
      }
      LogWSRequest::DownloadLogs(DownloadLogsRequest {
        backup_id,
        from_id,
      }) => {
        let (log_items, last_id) = db_client
          .fetch_log_items(&user_id, &backup_id, from_id)
          .await?;

        let mut messages = vec![];

        for LogItem {
          log_id,
          content,
          attachments,
          ..
        } in log_items
        {
          let content = content.fetch_bytes(&blob_client).await?;
          let attachments: Vec<String> =
            attachments.into_iter().map(|att| att.blob_hash).collect();
          let attachments = if attachments.is_empty() {
            None
          } else {
            Some(attachments)
          };
          messages.push(LogWSResponse::LogDownload {
            log_id,
            content,
            attachments,
          })
        }

        messages.push(LogWSResponse::LogDownloadFinished {
          last_log_id: last_id,
        });

        Ok(messages)
      }
    }
  }

  async fn create_attachment(
    blob_client: &BlobServiceClient,
    attachment: String,
  ) -> Result<BlobInfo, BlobServiceError> {
    let blob_info = BlobInfo {
      blob_hash: attachment,
      holder: uuid::Uuid::new_v4().to_string(),
    };

    if !blob_client
      .assign_holder(&blob_info.blob_hash, &blob_info.holder)
      .await?
    {
      warn!(
        "Blob attachment with hash {:?} doesn't exist",
        blob_info.blob_hash
      );
    }

    Ok(blob_info)
  }
}

impl Actor for LogWSActor {
  type Context = ws::WebsocketContext<Self>;

  #[instrument(skip_all)]
  fn started(&mut self, ctx: &mut Self::Context) {
    info!("Socket opened");
    ctx.run_interval(Self::HEARTBEAT_INTERVAL, |actor, ctx| {
      if Instant::now().duration_since(actor.last_msg_time)
        > Self::CONNECTION_TIMEOUT
      {
        warn!("Socket timeout, closing connection");
        ctx.stop();
        return;
      }

      ctx.ping(&[]);
    });
  }

  #[instrument(skip_all)]
  fn stopped(&mut self, _: &mut Self::Context) {
    info!("Socket closed");
  }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for LogWSActor {
  #[instrument(skip_all)]
  fn handle(
    &mut self,
    msg: Result<ws::Message, ws::ProtocolError>,
    ctx: &mut Self::Context,
  ) {
    let msg = match msg {
      Ok(msg) => msg,
      Err(err) => {
        warn!("Error during socket message handling: {err}");
        ctx.close(Some(CloseCode::Error.into()));
        ctx.stop();
        return;
      }
    };

    self.last_msg_time = Instant::now();

    match msg {
      ws::Message::Binary(bytes) => self.handle_msg_sync(ctx, bytes),
      // Continuations - this is mostly boilerplate code. Some websocket
      // clients may split a message into these ones
      ws::Message::Continuation(Item::FirstBinary(bytes)) => {
        if !self.buffer.is_empty() {
          warn!("Socket received continuation before previous was completed");
          ctx.close(Some(CloseCode::Error.into()));
          ctx.stop();
          return;
        }
        self.buffer.extend_from_slice(&bytes);
      }
      ws::Message::Continuation(Item::Continue(bytes)) => {
        if self.buffer.is_empty() {
          warn!("Socket received continuation message before it was started");
          ctx.close(Some(CloseCode::Error.into()));
          ctx.stop();
          return;
        }
        self.buffer.extend_from_slice(&bytes);
      }
      ws::Message::Continuation(Item::Last(bytes)) => {
        if self.buffer.is_empty() {
          warn!(
            "Socket received last continuation message before it was started"
          );
          ctx.close(Some(CloseCode::Error.into()));
          ctx.stop();
          return;
        }
        self.buffer.extend_from_slice(&bytes);
        let bytes = self.buffer.split();

        self.handle_msg_sync(ctx, bytes.into());
      }
      // Heartbeat
      ws::Message::Ping(message) => ctx.pong(&message),
      ws::Message::Pong(_) => (),
      // Other
      ws::Message::Text(_) | ws::Message::Continuation(Item::FirstText(_)) => {
        warn!("Socket received unsupported message");
        ctx.close(Some(CloseCode::Unsupported.into()));
        ctx.stop();
      }
      ws::Message::Close(reason) => {
        info!("Socket was closed");
        ctx.close(reason);
        ctx.stop();
      }
      ws::Message::Nop => (),
    }
  }
}
