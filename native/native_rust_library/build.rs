fn main() {
  tonic_build::compile_protos("../../shared/protos/identity.proto")
    .unwrap_or_else(|e| panic!("Failed to compile identity protos {:?}", e));
  tonic_build::compile_protos("../../shared/protos/blob.proto")
    .unwrap_or_else(|e| panic!("Failed to compile blob protos {:?}", e));
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++14");
  println!("cargo:rerun-if-changed=src/hello.c");
}
