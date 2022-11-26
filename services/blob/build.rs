fn main() {
  println!("cargo:rerun-if-changed=src/main.rs");

  println!("cargo:rerun-if-changed=../../shared/protos/blob.proto");
  tonic_build::compile_protos("../../shared/protos/blob.proto")
    .expect("Failed to compile protobuf file");
}
