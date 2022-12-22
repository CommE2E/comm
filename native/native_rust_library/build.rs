fn main() {
  tonic_build::configure()
    .build_server(false)
    .compile(
      &[
        "../../shared/protos/identity.proto",
        "../../shared/protos/tunnelbroker.proto",
      ],
      &["../../shared/protos"],
    )
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++14");
  println!("cargo:rerun-if-changed=src/hello.c");
}
