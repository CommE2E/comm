{ mkShell
, stdenv
, lib
, amqp-cpp
, arcanist
, aws-sdk-cpp
, boost
, cargo
, cmake
, cmake-format
, cocoapods
, corrosion
, cryptopp
, darwin
, double-conversion
, folly
, fmt
, glog
, grpc
, libiconv
, libuv
, nodejs-16_x
, olm
, openssl
, pkg-config
, protobuf_3_15_cmake
, python3
, sqlite
, watchman
, rustfmt
, yarn
}:

mkShell {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    # generic development
    arcanist

    # node development
    nodejs-16_x
    yarn
    watchman # react native
    python3

    # native dependencies
    # C/CXX toolchains are already brought in with mkShell
    # Identity Service
    cargo # includes rustc
    rustfmt

    # Tunnelbroker + CMake
    amqp-cpp
    cryptopp
    cmake
    cmake-format # linting
    libuv
    pkg-config
    protobuf_3_15_cmake
    grpc
  ] ++ lib.optionals stdenv.isDarwin [
    cocoapods # needed for ios
  ];

  # include any libraries buildInputs
  buildInputs = [
    # protobuf exposes both a library and a command
    # thus should appear in both inputs
    protobuf_3_15_cmake
    aws-sdk-cpp # tunnelbroker
    corrosion # tunnelbroker
    double-conversion # tunnelbroker
    glog # tunnelbroker
    folly # cpp tools
    fmt # needed for folly
    boost # needed for folly
    olm # needed for CryptoTools
    sqlite # needed for sqlite_orm
    openssl # needed for grpc
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    CoreFoundation
    CoreServices
    Security
    libiconv  # identity service
  ]);

  # shell commands to be ran upon entering shell
  shellHook = let
    socket = "mysql-socket/mysql.sock";
  in ''
    if [[ "$OSTYPE" == 'linux'* ]]; then
      export MYSQL_UNIX_PORT=''${XDG_RUNTIME_DIR:-/run/user/$UID}/${socket}
    fi

    if [[ "$OSTYPE" == 'darwin'* ]]; then
      # Many commands for cocoapods expect the native BSD versions of commands
      export PATH=/usr/bin:$PATH
    fi

    echo "Welcome to Comm dev environment! :)"
  '';
}
