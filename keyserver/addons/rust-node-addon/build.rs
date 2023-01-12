extern crate napi_build;

fn main() {
  napi_build::setup();
  tonic_build::compile_protos("../../../shared/protos/identity.proto")
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
}
