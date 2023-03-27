use crate::error::OpaqueError;
use log::info;
use opaque_ke::errors::ProtocolError;
use tonic::Status;

pub fn opaque_error_to_grpc_status(error: OpaqueError) -> tonic::Status {
  protocol_error_to_grpc_status(error.into())
}

pub fn protocol_error_to_grpc_status(error: ProtocolError) -> tonic::Status {
  match error {
    ProtocolError::IdentityGroupElementError => {
      info!("Failed to validate password");
      Status::aborted("server error")
    }
    ProtocolError::InvalidLoginError => {
      info!("Failed to login");
      Status::aborted("login failed")
    }
    ProtocolError::LibraryError(_) => {
      info!("Opaque error");
      Status::invalid_argument("internal error")
    }
    ProtocolError::ReflectedValueError => {
      info!("OPRF value was reflected");
      Status::invalid_argument("invalid server response")
    }
    ProtocolError::SerializationError => {
      info!("Invalid argument");
      Status::invalid_argument("invalid argument")
    }
  }
}
