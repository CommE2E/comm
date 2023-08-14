fn main() {
  tonic_build::configure()
    .build_server(false)
    .compile(
      &[
        "../protos/identity_client.proto",
        "../protos/identity_authenticated.proto",
      ],
      &["../protos"],
    )
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
}
