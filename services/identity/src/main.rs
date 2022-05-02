use clap::{Parser, Subcommand};
use tonic::transport::Server;

mod keygen;
mod opaque;
mod service;

use keygen::generate_and_persist_keypair;
use service::{IdentityServiceServer, MyIdentityService};

const IDENTITY_SERVICE_SOCKET_ADDR: &str = "[::]:50051";
const DEFAULT_SECRETS_DIRECTORY: &str = "secrets";

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
    #[clap(default_value_t = String::from(DEFAULT_SECRETS_DIRECTORY))]
    dir: String,
  },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
  let cli = Cli::parse();
  match &cli.command {
    Commands::Keygen { dir } => {
      generate_and_persist_keypair(dir)?;
    }
    Commands::Server => {
      let addr = IDENTITY_SERVICE_SOCKET_ADDR.parse()?;
      let identity_service = MyIdentityService::default();

      Server::builder()
        .add_service(IdentityServiceServer::new(identity_service))
        .serve(addr)
        .await?;
    }
  }

  Ok(())
}
