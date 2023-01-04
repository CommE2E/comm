fn main() {
  println!("cargo:rerun-if-changed=src/main.rs");

  println!("cargo:rerun-if-changed=../../shared/protos/backup.proto");
  println!("cargo:rerun-if-changed=../../shared/protos/blob.proto");
  tonic_build::compile_protos("../../shared/protos/backup.proto")
    .expect("Failed to compile Backup protobuf file");
  tonic_build::compile_protos("../../shared/protos/blob.proto")
    .expect("Failed to compile Blob protobuf file");
}
