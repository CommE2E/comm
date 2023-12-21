fn main() -> Result<(), Box<dyn std::error::Error>> {
  tonic_build::configure()
    .build_server(true)
    .build_client(false)
    .compile(
      &[
        "../../shared/protos/identity_unauthenticated.proto",
        "../../shared/protos/identity_authenticated.proto",
      ],
      &["../../shared/protos/"],
    )?;
  Ok(())
}
