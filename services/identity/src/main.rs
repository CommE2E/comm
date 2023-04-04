use clap::{Parser, Subcommand};
use database::DatabaseClient;
use interceptor::check_auth;
use tonic::transport::Server;
use tracing_subscriber::FmtSubscriber;

mod client_service;
mod config;
pub mod constants;
mod database;
mod interceptor;
mod keygen;
mod nonce;
mod pake_grpc;
mod service;
mod token;

use config::load_config;
use constants::{IDENTITY_SERVICE_SOCKET_ADDR, SECRETS_DIRECTORY};
use keygen::generate_and_persist_keypair;
use service::{IdentityKeyserverServiceServer, MyIdentityService};
use tracing::info;

use client_service::{ClientService, IdentityClientServiceServer};

#[derive(Parser)]
#[clap(author, version, about, long_about = None)]
#[clap(propagate_version = true)]
struct Cli {
  #[clap(subcommand)]
  command: Commands,
}

#[derive(Subcommand)]
enum Commands {
  /// Runs the server
  Server,
  /// Generates and persists a keypair to use for PAKE registration and login
  Keygen {
    #[clap(short, long)]
    #[clap(default_value_t = String::from(SECRETS_DIRECTORY))]
    dir: String,
  },
  /// Populates the `identity-users` table in DynamoDB from MySQL
  PopulateDB,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  let subscriber = FmtSubscriber::new();
  tracing::subscriber::set_global_default(subscriber)?;
  let cli = Cli::parse();
  match &cli.command {
    Commands::Keygen { dir } => {
      generate_and_persist_keypair(dir)?;
    }
    Commands::Server => {
      load_config();
      let addr = IDENTITY_SERVICE_SOCKET_ADDR.parse()?;
      let aws_config = aws_config::from_env().region("us-east-2").load().await;
      let database_client = DatabaseClient::new(&aws_config);
      let server = MyIdentityService::new(database_client.clone());
      let keyserver_service =
        IdentityKeyserverServiceServer::with_interceptor(server, check_auth);
      let client_service =
        IdentityClientServiceServer::new(ClientService::new(database_client));
      info!("Listening to gRPC traffic on {}", addr);
      Server::builder()
        .accept_http1(true)
        .add_service(keyserver_service)
        .add_service(tonic_web::enable(client_service))
        .serve(addr)
        .await?;
    }
    Commands::PopulateDB => unimplemented!(),
  }

  Ok(())
}
