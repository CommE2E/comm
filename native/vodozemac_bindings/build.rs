fn main() {
  let _cxx_build =
    cxx_build::bridge("src/lib.rs").flag_if_supported("-std=c++17");

  println!("RUNNING");

  println!("cargo:rerun-if-changed=src/crypto.rs");
  println!("cargo:rerun-if-changed=src/lib.rs");
}
