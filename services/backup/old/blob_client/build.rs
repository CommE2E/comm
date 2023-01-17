const PROTO_DIR: &'static str = "../../../../shared/protos";

fn main() -> Result<(), std::io::Error> {
  let _build = cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");
  println!("cargo:rerun-if-changed=src/lib.rs");

  tonic_build::compile_protos(format!("{}/blob.proto", PROTO_DIR))?;

  Ok(())
}
