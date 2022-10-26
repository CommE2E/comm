use tonic::{Code, Status};

pub fn create_tonic_status(code: u8, text: &str) -> Status {
  let status = match code {
    0 => Code::Ok,
    1 => Code::Cancelled,
    2 => Code::Unknown,
    3 => Code::InvalidArgument,
    4 => Code::DeadlineExceeded,
    5 => Code::NotFound,
    6 => Code::AlreadyExists,
    7 => Code::PermissionDenied,
    8 => Code::ResourceExhausted,
    9 => Code::FailedPrecondition,
    10 => Code::Aborted,
    11 => Code::OutOfRange,
    12 => Code::Unimplemented,
    13 => Code::Internal,
    14 => Code::Unavailable,
    15 => Code::DataLoss,
    16 => Code::Unauthenticated,
    _ => Code::Internal,
  };
  Status::new(status, text)
}
