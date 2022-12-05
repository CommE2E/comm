fn main() {
  println!("cargo:rerun-if-changed=src/main.rs");

  println!("cargo:rerun-if-changed=../../shared/protos/backup.proto");
  tonic_build::compile_protos("../../shared/protos/backup.proto")
    .expect("Failed to compile protobuf file");
}
