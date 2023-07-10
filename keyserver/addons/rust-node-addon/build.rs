extern crate napi_build;

fn main() {
  napi_build::setup();
  tonic_build::configure()
    .build_server(false)
    .compile(
      &[
        "../../../shared/protos/identity_client.proto",
        "../../../shared/protos/identity_authenticated.proto",
      ],
      &["../../../shared/protos"],
    )
    .unwrap_or_else(|e| panic!("Failed to compile protos {:?}", e));
}
