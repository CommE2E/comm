{ lib
, stdenv
, cmake
, openssl
, pkg-config
, grpc
, ninja
, protobuf_3_15_cmake
}:

stdenv.mkDerivation rec {
  name = "comm-grpc";

  src = ../native/cpp/CommonCpp/grpc;

  nativeBuildInputs = [
    cmake
    ninja
    pkg-config
  ];

  buildInputs = [
    openssl
    grpc
    protobuf_3_15_cmake
  ];
}
