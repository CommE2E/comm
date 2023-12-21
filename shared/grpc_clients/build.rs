fn main() {
  tonic_build::configure()
    .build_server(false)
    .compile(
      &[
        "../protos/identity_unauth.proto",
        "../protos/identity_auth.proto",
        "../protos/tunnelbroker.proto",
      ],
      &["../protos"],
    )
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));

  println!("cargo:rerun-if-changed=../protos/identity_unauth.proto");
  println!("cargo:rerun-if-changed=../protos/identity_auth.proto");
  println!("cargo:rerun-if-changed=../protos/tunnelbroker.proto");
}
