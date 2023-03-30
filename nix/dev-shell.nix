{ mkShell
, stdenv
, lib
, amqp-cpp
, awscli2
, arcanist
, aws-sdk-cpp
, better-prompt
, boost
, bundler
, c-ares_cmake-config
, cargo-udeps
, cmake
, cmake-format
, cocoapods
, corrosion
, darwin
, double-conversion
, folly
, fmt
, glog
, grpc
, gtest
, libiconv
, libuv
, localstack
, mariadb
, mariadb-up
, nodejs-16_x-openssl_1_1
, olm
, openjdk11
, openssl
, pkg-config
, protobuf_3_15_cmake
, python3
, rabbitmq-server
, redis
, redis-up
, rustup
, shellcheck
, sqlite
, terraform
, rustfmt
, wasm-pack
, yarn
}:

mkShell {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    # generic development or tools
    arcanist
    awscli2
    shellcheck
    terraform

    # android
    openjdk11

    # node development
    mariadb
    nodejs-16_x-openssl_1_1
    yarn
    python3
    redis
    wasm-pack

    # native dependencies
    # C/CXX toolchains are already brought in with mkShell
    # Identity Service
    rustfmt
    rustup
    cargo-udeps

    # Tunnelbroker + CMake
    amqp-cpp
    c-ares_cmake-config
    cmake
    cmake-format # linting
    libuv
    localstack
    pkg-config
    protobuf_3_15_cmake
    grpc
    rabbitmq-server # runtime service
  ] ++ lib.optionals stdenv.isDarwin [
    cocoapods # needed for ios
    bundler
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
    gtest # testing services
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

  JAVA_HOME = openjdk11.passthru.home;

  # shell commands to be ran upon entering shell
  shellHook = ''
    PRJ_ROOT=$(git rev-parse --show-toplevel)

    # Set development environment variable defaults
    source "${../scripts/source_development_defaults.sh}"

    # Cache development path for some use cases such as XCode
    "$PRJ_ROOT/scripts/save_path.sh"

  ''
  # Darwin condition can be removed once linux services are supported
  + lib.optionalString stdenv.isDarwin ''
    # Start MariaDB development services
    "${mariadb-up}"/bin/mariadb-up &
    mariadb_pid=$!

    "${redis-up}"/bin/redis-up &
    redis_pid=$!

    wait "$mariadb_pid" "$redis_pid"

    ${../scripts}/install_homebrew_macos.sh

    ${../scripts}/install_homebrew_deps.sh watchman
  '' + ''

    # Render default configuration for keyserver
    $PRJ_ROOT/scripts/create_url_facts.sh

    # Ensure rustup tooling is installed
    $PRJ_ROOT/scripts/ensure_rustup_setup.sh

    # Provide decent bash prompt
    source "${better-prompt}/bin/better-prompt"

    echo "Welcome to Comm dev environment! :)"
  '';
}
