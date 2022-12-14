{ stdenv
, lib
, rustPlatform
, fetchFromGitHub
, protobuf_3_15_cmake
, darwin
}:

rustPlatform.buildRustPackage rec {
  pname = "blob";
  version = "0.0.1";

  src = ../services/blob;

  cargoLock.lockFile = ../services/blob/Cargo.lock;

  prePatch = ''
    mkdir ../../shared
    cp -r ${../shared/protos} ../../shared/protos
  '';

  nativeBuildInputs = [
    protobuf_3_15_cmake
  ];

  buildInputs = lib.optionals stdenv.isDarwin [
    darwin.apple_sdk.frameworks.Security
    darwin.libiconv
  ];

  meta = with lib; {
    license = licenses.bsd3;
  };
}
