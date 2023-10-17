use std::env;
use std::fmt::Display;

use tokio_tungstenite::tungstenite;

pub static TUNNELBROKER_WS: &ServiceAddr = &ServiceAddr {
  scheme: "ws",
  endpoint_env_var: "TUNNELBROKER_WS_ENDPOINT",
  port_env_var: "COMM_SERVICES_PORT_TUNNELBROKER_WS",
  default_port: 51001,
};
pub static TUNNELBROKER_GRPC: &ServiceAddr = &ServiceAddr {
  scheme: "http",
  endpoint_env_var: "TUNNELBROKER_GRPC_ENDPOINT",
  port_env_var: "COMM_SERVICES_PORT_TUNNELBROKER",
  default_port: 50051,
};
pub static BACKUP_SERVICE_HTTP: &ServiceAddr = &ServiceAddr {
  scheme: "http",
  endpoint_env_var: "BACKUP_SERVICE_URL",
  port_env_var: "COMM_SERVICES_PORT_BACKUP",
  default_port: 50052,
};
pub static BLOB_SERVICE_HTTP: &ServiceAddr = &ServiceAddr {
  scheme: "http",
  endpoint_env_var: "BLOB_SERVICE_URL",
  port_env_var: "COMM_SERVICES_PORT_BLOB",
  default_port: 50053,
};
pub static IDENTITY_GRPC: &ServiceAddr = &ServiceAddr {
  scheme: "http",
  endpoint_env_var: "IDENTITY_GRPC_ENDPOINT",
  port_env_var: "COMM_SERVICES_PORT_IDENTITY",
  default_port: 50054,
};

#[derive(Debug, Clone, Copy)]
pub struct ServiceAddr {
  scheme: &'static str,
  default_port: u16,
  /// Environment variable name for the endpoint
  /// that overrides all other values
  endpoint_env_var: &'static str,
  /// Environment variable name for the port, overrides default_port
  /// If `endpoint_env_var` is set, this is ignored.
  /// Otherwise, addr is `scheme://localhost:${port_env_var}`
  port_env_var: &'static str,
}

impl Display for ServiceAddr {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    if let Ok(endpoint) = env::var(self.endpoint_env_var) {
      return write!(f, "{}", endpoint);
    }

    let port = env::var(self.port_env_var)
      .ok()
      .and_then(|port| port.parse::<u16>().ok())
      .unwrap_or(self.default_port);

    write!(f, "{}://localhost:{}", self.scheme, port)
  }
}

impl TryFrom<&ServiceAddr> for reqwest::Url {
  type Error = url::ParseError;

  fn try_from(service_addr: &ServiceAddr) -> Result<Self, Self::Error> {
    reqwest::Url::parse(&service_addr.to_string())
  }
}

impl TryFrom<&ServiceAddr> for tonic::transport::Endpoint {
  type Error = tonic::transport::Error;

  fn try_from(value: &ServiceAddr) -> Result<Self, Self::Error> {
    value.to_string().try_into()
  }
}

impl tungstenite::client::IntoClientRequest for &ServiceAddr {
  fn into_client_request(
    self,
  ) -> tungstenite::Result<tungstenite::handshake::client::Request> {
    self.to_string().into_client_request()
  }
}
