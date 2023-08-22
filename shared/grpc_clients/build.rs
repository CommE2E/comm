fn main() {
  tonic_build::configure()
    .build_server(false)
    .compile(
      &[
        "../protos/identity_client.proto",
        "../protos/identity_authenticated.proto",
        "../protos/tunnelbroker.proto",
      ],
      &["../protos"],
    )
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));

  println!("cargo:rerun-if-changed=../protos/identity_client.proto");
  println!("cargo:rerun-if-changed=../protos/identity_authenticated.proto");
  println!("cargo:rerun-if-changed=../protos/tunnelbroker.proto");
}
