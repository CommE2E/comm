use crate::server::GRPCStatusCodes;
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
