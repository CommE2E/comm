{ mkShell
, stdenv
, lib
, androidDevEnv
, arcanist
, darwin
, flow
, nodejs-16_x
, openjdk11
, protobuf3_15
, yarn
}:

mkShell rec {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    arcanist
    flow
    nodejs-16_x
    protobuf3_15
    yarn
  ] ++ lib.optionals stdenv.isx86_64 [
    # aarch64-darwin tarballs are not available
    androidDevEnv.androidsdk
  ];

  # include any libraries or programs in buildInputs
  buildInputs = [
    protobuf3_15
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    CoreFoundation
    Security
  ]);

  # if a package exposes many commands, libraries, shellhooks, etc. Add here
  inputsFrom = [
    openjdk11
  ];

  # shell commands to be ran upon entering shell
  shellHook = ''
    echo "Welcome to Comm dev environment! :)"
  '';
}
