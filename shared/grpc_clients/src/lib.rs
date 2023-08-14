pub mod error;
pub mod identity;

use std::path::Path;

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
