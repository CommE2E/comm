fn main() {
  tonic_build::configure()
    .build_server(true)
    .build_client(false)
    .compile(
      &["../../shared/protos/tunnelbroker.proto"],
      &["../../shared/protos/"],
    )
    .expect("Failed to compile protobuf file");

  println!("cargo:rerun-if-changed=../../shared/protos/tunnelbroker.proto");
}
