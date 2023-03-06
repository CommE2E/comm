use log::info;
use opaque_ke::errors::ProtocolError;
use tonic::Status;

#[allow(dead_code)]
fn protocol_error_to_grpc_status(error: ProtocolError) -> tonic::Status {
  match error {
    ProtocolError::VerificationError(_) => {
      info!("Failed to validate password");
      Status::aborted("server error")
    }
    ProtocolError::ServerError => {
      info!("Invalid server response");
      Status::aborted("server error")
    }
    ProtocolError::ServerInvalidEnvelopeCredentialsFormatError => {
      info!("Invalid server credential format");
      Status::invalid_argument("bad response")
    }
    ProtocolError::ClientError => {
      info!("Client response cannot be handled");
      Status::invalid_argument("bad client response")
    }
    ProtocolError::ReflectedValueError => {
      info!("OPRF value was reflected");
      Status::invalid_argument("invalid server response")
    }
  }
}
