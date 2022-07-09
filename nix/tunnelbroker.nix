{ lib
, stdenv
, amqp-cpp
, aws-sdk-cpp
, boost
, cmake
, cryptopp
, double-conversion
, folly
, fmt
, glog
, grpc
, libuv
, ninja
, openssl
, pkg-config
, protobuf_3_15_cmake
, sqlite

# docker image
, dockerTools
}:

# `finalAttrs` refers the package after all overrides.
# Also allows the package to be referenced from within the expression
let
  self = stdenv.mkDerivation {
    name = "comm-tunnelbroker";

    src = ../.;

    prePatch = ''
      cd services/tunnelbroker
    '';

    nativeBuildInputs = [
      cmake
      ninja
      pkg-config
    ];

    buildInputs = [
      amqp-cpp
      aws-sdk-cpp
      boost
      cryptopp
      double-conversion
      fmt
      folly
      glog
      grpc
      libuv
      openssl
      protobuf_3_15_cmake
      sqlite
    ];

    # TODO: Fix upstream logic to allow for aws-sdk-cpp to work with headers
    # and libs being located in different directories
    cmakeFlags = let
      awsDev = lib.getDev aws-sdk-cpp;
    in [
      "-DAWSSDK_ROOT_DIR=${awsDev}"
      "-DAWSSDK_CORE_HEADER_FILE=${awsDev}/include/aws/core/Aws.h"
    ];

    # export a dockerImage alongside of the service
    passthru.dockerImage = dockerTools.buildImage {
      name = "tunnelbroker";
      tag = "latest";

      contents = [ self ];

      config = {
        Cmd = [ "/bin/tunnelbroker" ];
      };
    };
  };
in
  self
