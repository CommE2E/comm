pub mod error;
pub mod identity;
pub mod tunnelbroker;

use error::Error;
use std::path::Path;
use tonic::transport::{Certificate, Channel, ClientTlsConfig};
use tracing::info;

const CERT_PATHS: &'static [&'static str] = &[
  // MacOS and newer Ubuntu
  "/etc/ssl/cert.pem",
  // Common CA cert paths
  "/etc/ssl/certs/ca-bundle.crt",
  "/etc/ssl/certs/ca-certificates.crt",
];

pub(crate) fn get_ca_cert_contents() -> Option<String> {
  CERT_PATHS
    .iter()
    .map(Path::new)
    .filter(|p| p.exists())
    .filter_map(|f| std::fs::read_to_string(f).ok())
    .next()
}
pub(crate) async fn get_grpc_service_channel(
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
