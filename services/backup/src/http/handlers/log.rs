use actix::{Actor, ActorContext, AsyncContext, StreamHandler};
use actix_http::ws::{CloseCode, Item};
use actix_web::{
  web::{self, Bytes, BytesMut},
  Error, HttpRequest, HttpResponse,
};
use actix_web_actors::ws::{self, WebsocketContext};
use comm_lib::auth::UserIdentity;
use std::{
  sync::Arc,
  time::{Duration, Instant},
};
use tracing::{info, instrument, warn};

pub async fn handle_ws(
  user: UserIdentity,
  path: web::Path<String>,
  req: HttpRequest,
  stream: web::Payload,
) -> Result<HttpResponse, Error> {
  let backup_id = path.into_inner();
  ws::start(
    LogWSActor {
      info: Arc::new(ConnectionInfo { user, backup_id }),
      last_msg: Instant::now(),
      buffer: BytesMut::new(),
    },
    &req,
    stream,
  )
}

struct ConnectionInfo {
  user: UserIdentity,
  backup_id: String,
}

struct LogWSActor {
  info: Arc<ConnectionInfo>,
  last_msg: Instant,
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
    ctx.binary(bytes);
  }
}

impl Actor for LogWSActor {
  type Context = ws::WebsocketContext<Self>;

  #[instrument(skip_all, fields(user = %self.info.user, backup_id = self.info.backup_id))]
  fn started(&mut self, ctx: &mut Self::Context) {
    info!("Socket opened");
    ctx.run_interval(Self::HEARTBEAT_INTERVAL, |actor, ctx| {
      if Instant::now().duration_since(actor.last_msg)
        > Self::CONNECTION_TIMEOUT
      {
        warn!("Socket timeout, closing connection");
        ctx.stop();
        return;
      }

      ctx.ping(&[]);
    });
  }

  #[instrument(skip_all, fields(user = %self.info.user, backup_id = self.info.backup_id))]
  fn stopped(&mut self, _: &mut Self::Context) {
    info!("Socket closed");
  }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for LogWSActor {
  #[instrument(skip_all, fields(user = %self.info.user, backup_id = self.info.backup_id))]
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

    self.last_msg = Instant::now();

    match msg {
      ws::Message::Binary(bytes) => self.handle_msg_sync(ctx, bytes),
      // Continuations
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
