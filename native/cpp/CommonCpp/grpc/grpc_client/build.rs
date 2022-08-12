fn main() {
  tonic_build::compile_protos("../protos/identity.proto")
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
  let _cxx_build = cxx_build::bridge("src/lib.rs");
  println!("cargo:rerun-if-changed=src/hello.c");
}
