pub mod authenticated;
pub mod unauthenticated;

pub mod protos {
  // This must be named client for authenticated generated code
  pub mod client {
    tonic::include_proto!("identity.client");
  }
  pub use client as unauthenticated;

  pub mod authenticated {
    tonic::include_proto!("identity.authenticated");
  }
}

use crate::error::Error;
use tonic::transport::Channel;
use tonic::transport::{Certificate, ClientTlsConfig};
use tracing::{self, info};

pub use authenticated::get_auth_client;
pub use unauthenticated::get_unauthenticated_client;

pub(crate) async fn get_identity_service_channel(
  url: &str,
) -> Result<Channel, Error> {
  let ca_cert = crate::get_ca_cert_contents().expect("Unable to get CA bundle");

  info!("Connecting to identity service at {}", url);
  let mut channel = Channel::from_shared(url.to_string())?;

  // tls_config will fail if the underlying URI is only http://
  if url.starts_with("https:") {
    channel = channel.tls_config(
      ClientTlsConfig::new().ca_certificate(Certificate::from_pem(&ca_cert)),
    )?
  }

  Ok(channel.connect().await?)
}
