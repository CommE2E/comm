use comm_lib::auth::AuthService;
use comm_lib::aws;
use comm_lib::aws::config::timeout::TimeoutConfig;
use comm_lib::aws::config::BehaviorVersion;
use config::Command;
use database::DatabaseClient;
use tonic::transport::Server;
use tonic_web::GrpcWebLayer;

mod client_service;
mod config;
pub mod constants;
mod cors;
mod database;
pub mod ddb_utils;
mod device_list;
pub mod error;
mod grpc_services;
mod grpc_utils;
mod http;
mod id;
mod keygen;
mod log;
mod nonce;
mod olm;
mod regex;
mod reserved_users;
mod siwe;
mod sync_identity_search;
mod token;
mod websockets;

mod comm_service {
  pub mod backup;
  pub mod tunnelbroker;
}

use constants::{COMM_SERVICES_USE_JSON_LOGS, IDENTITY_SERVICE_SOCKET_ADDR};
use cors::cors_layer;
use keygen::generate_and_persist_keypair;
use std::env;
use sync_identity_search::sync_index;
use tokio::time::Duration;
use tracing::{self, info, Level};
use tracing_subscriber::EnvFilter;

use client_service::{ClientService, IdentityClientServiceServer};
use grpc_services::authenticated::AuthenticatedService;
use grpc_services::protos::auth::identity_client_service_server::IdentityClientServiceServer as AuthServer;
use websockets::errors::BoxedError;

#[tokio::main]
async fn main() -> Result<(), BoxedError> {
  let filter = EnvFilter::builder()
    .with_default_directive(Level::INFO.into())
    .with_env_var(EnvFilter::DEFAULT_ENV)
    .from_env_lossy();

  let use_json_logs: bool = env::var(COMM_SERVICES_USE_JSON_LOGS)
    .unwrap_or("false".to_string())
    .parse()
    .unwrap_or_default();

  if use_json_logs {
    let subscriber = tracing_subscriber::fmt()
      .json()
      .with_env_filter(filter)
      .finish();
    tracing::subscriber::set_global_default(subscriber)?;
  } else {
    let subscriber = tracing_subscriber::fmt().with_env_filter(filter).finish();
    tracing::subscriber::set_global_default(subscriber)?;
  }

  match config::parse_cli_command() {
    Command::Keygen { dir } => {
      generate_and_persist_keypair(dir)?;
    }
    Command::Server => {
      config::load_server_config();
      let addr = IDENTITY_SERVICE_SOCKET_ADDR.parse()?;
      let aws_config = aws::config::defaults(BehaviorVersion::v2024_03_28())
        .timeout_config(
          TimeoutConfig::builder()
            .connect_timeout(Duration::from_secs(60))
            .build(),
        )
        .region("us-east-2")
        .load()
        .await;
      let comm_auth_service =
        AuthService::new(&aws_config, "http://localhost:50054".to_string());
      let database_client = DatabaseClient::new(&aws_config);
      let inner_client_service = ClientService::new(database_client.clone());
      let client_service = IdentityClientServiceServer::with_interceptor(
        inner_client_service,
        grpc_services::shared::version_interceptor,
      );
      let inner_auth_service =
        AuthenticatedService::new(database_client.clone(), comm_auth_service);
      let db_client = database_client.clone();
      let auth_service =
        AuthServer::with_interceptor(inner_auth_service, move |req| {
          grpc_services::authenticated::auth_interceptor(req, &db_client)
            .and_then(grpc_services::shared::version_interceptor)
        });

      info!("Listening to gRPC traffic on {}", addr);

      let grpc_server = Server::builder()
        .accept_http1(true)
        .layer(cors_layer())
        .layer(GrpcWebLayer::new())
        .trace_fn(|_| {
          tracing::info_span!(
            "grpc_request",
            request_id = uuid::Uuid::new_v4().to_string()
          )
        })
        .add_service(client_service)
        .add_service(auth_service)
        .serve(addr);

      let websocket_server = websockets::run_server(database_client);

      return tokio::select! {
        websocket_result = websocket_server => websocket_result,
        grpc_result = grpc_server => { grpc_result.map_err(|e| e.into()) },
      };
    }
    Command::SyncIdentitySearch => {
      let aws_config = aws::config::defaults(BehaviorVersion::v2024_03_28())
        .region("us-east-2")
        .load()
        .await;
      let database_client = DatabaseClient::new(&aws_config);
      let sync_result = sync_index(&database_client).await;

      error::consume_error(sync_result);
    }
  }

  Ok(())
}
