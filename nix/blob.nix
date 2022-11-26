{ stdenv
, lib
, rustPlatform
, fetchFromGitHub
, commSrc
, protobuf_3_15_cmake
, dockerTools
, darwin
}:

let
  blob = rustPlatform.buildRustPackage rec {
    pname = "blob";
    version = "0.0.1";

    src = commSrc;

    prePatch = "cd services/blob";

    cargoLock.lockFile = ../services/blob/Cargo.lock;

    nativeBuildInputs = [
      protobuf_3_15_cmake
    ];

    buildInputs = lib.optionals stdenv.isDarwin [
      darwin.apple_sdk.frameworks.Security
      darwin.libiconv
    ];

    # Expose docker image for linux platforms
    passthru = lib.optionalAttrs stdenv.isLinux {
      dockerImage = dockerTools.buildImage {
        name = "comm-blob";
        tag = "latest";
        contents = [ blob ];
        config.Cmd = [ "/bin/blob" ];
      }
    };

    meta = with lib; {
      license = licenses.bsd3;
    };
  };
in
  blob
