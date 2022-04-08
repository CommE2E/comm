{ mkShell
, stdenv
, lib
, arcanist
, darwin
, nodejs-16_x
, protobuf3_15
, yarn
}:

mkShell rec {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    arcanist
    nodejs-16_x
    protobuf3_15
    yarn
  ];

  # include any libraries buildInputs
  buildInputs = [
    protobuf3_15 # exposes both a library and a command, thus should appear in both inputs
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    CoreFoundation
    Security
  ]);

  # shell commands to be ran upon entering shell
  shellHook = ''
    echo "Welcome to Comm dev environment! :)"
  '';
}
