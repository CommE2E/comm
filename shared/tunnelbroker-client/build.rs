fn main() {
  tonic_build::compile_protos("../protos/tunnelbroker.proto")
    .unwrap_or_else(|e| panic!("Failed to compile proto {:?}", e));
  println!("cargo:rerun-if-changed=../protos/tunnelbroker.proto");
}
