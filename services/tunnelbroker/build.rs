fn main() {
  tonic_build::configure()
    .build_server(true)
    .build_client(false)
    .compile(
      &["../../shared/protos/identity_tunnelbroker.proto"],
      &["../../shared/protos/"],
    )
    .expect("Failed to compile protobuf file");
}