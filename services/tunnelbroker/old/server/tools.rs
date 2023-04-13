use crate::server::GRPCStatusCodes;
use openssl::pkey::PKey;
use openssl::sign::Verifier;
use openssl::{error::ErrorStack, hash::MessageDigest};
use tonic::{Code, Status};

pub fn create_tonic_status(code: GRPCStatusCodes, text: &str) -> Status {
  let status = match code {
    GRPCStatusCodes::Ok => Code::Ok,
    GRPCStatusCodes::Cancelled => Code::Cancelled,
    GRPCStatusCodes::Unknown => Code::Unknown,
    GRPCStatusCodes::InvalidArgument => Code::InvalidArgument,
    GRPCStatusCodes::DeadlineExceeded => Code::DeadlineExceeded,
    GRPCStatusCodes::NotFound => Code::NotFound,
    GRPCStatusCodes::AlreadyExists => Code::AlreadyExists,
    GRPCStatusCodes::PermissionDenied => Code::PermissionDenied,
    GRPCStatusCodes::ResourceExhausted => Code::ResourceExhausted,
    GRPCStatusCodes::FailedPrecondition => Code::FailedPrecondition,
    GRPCStatusCodes::Aborted => Code::Aborted,
    GRPCStatusCodes::OutOfRange => Code::OutOfRange,
    GRPCStatusCodes::Unimplemented => Code::Unimplemented,
    GRPCStatusCodes::Internal => Code::Internal,
    GRPCStatusCodes::Unavailable => Code::Unavailable,
    GRPCStatusCodes::DataLoss => Code::DataLoss,
    GRPCStatusCodes::Unauthenticated => Code::Unauthenticated,
    _ => Code::Internal,
  };
  Status::new(status, text)
}

pub fn verify_signed_string(
  public_key_pem: &str,
  string_to_be_signed: &str,
  base64_signature: &str,
) -> Result<bool, ErrorStack> {
  let public_key = PKey::public_key_from_pem(public_key_pem.as_bytes())?;
  let mut verifier = Verifier::new(MessageDigest::sha256(), &public_key)?;
  verifier.update(string_to_be_signed.as_bytes()).unwrap();
  verifier.verify(
    &base64::decode(base64_signature)
      .expect("Error on decoding the signature from base64"),
  )
}
