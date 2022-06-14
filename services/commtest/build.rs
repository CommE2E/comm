use std::env;

fn main() -> Result<(), Error> {
  let target_service = env::var("COMM_TEST_TARGET")?;
  tonic_build::compile_protos(format!(
    "../../native/cpp/CommonCpp/grpc/protos/{}.proto",
    target_service
  ))?;
  Ok(())
}

#[derive(
  Debug, derive_more::Display, derive_more::From, derive_more::Error,
)]
enum Error {
  #[display(...)]
  EnvVar(env::VarError),
  #[display(...)]
  Proto(std::io::Error),
}
