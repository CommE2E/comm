{ mkShell
, androidDevEnv
, arcanist
, flow
, nodejs-16_x
, openjdk11
, protobuf3_15
, yarn
}:

mkShell rec {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    androidDevEnv.androidsdk
    arcanist
    flow
    nodejs-16_x
    protobuf3_15
    yarn
  ];

  # include any libraries or programs in buildInputs
  buildInputs = [
    protobuf3_15
  ];

  # if a package exposes many commands, libraries, shellhooks, etc. Add here
  inputsFrom = [
    openjdk11
  ];

  # shell commands to be ran upon entering shell
  shellHook = ''
    echo "Welcome to Comm dev environment! :)"
  '';
}
