{ mkShell
, stdenv
, lib
, awscli2
, arcanist
, better-prompt
, boost
, bundler
, c-ares_cmake-config
, cargo-lambda
, cargo-udeps
, cmake
, cmake-format
, cocoapods
, corrosion
, darwin
, double-conversion
, emscripten
, folly
, fmt
, glog
, grpc
, jq
, libiconv
, libuv
, localstack
, mariadb
, mariadb-up
, nodejs
, olm
, openjdk11
, openssl
, pkg-config
, protobuf3_21
, python3
, rabbitmq-server
, redis
, redis-up
, rustup
, shellcheck
, sops
, sqlite
, terraform
, watchman
, rustfmt
, wasm-pack
, yarn
, protoc-gen-grpc-web
}:

mkShell {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    # generic development or tools
    arcanist
    awscli2
    jq
    shellcheck
    sops
    terraform
    emscripten

    # android
    openjdk11

    # node development
    mariadb
    nodejs
    yarn
    watchman # react native
    python3
    redis
    wasm-pack
    protoc-gen-grpc-web

    # native dependencies
    # C/CXX toolchains are already brought in with mkShell
    # Identity Service
    rustfmt
    rustup
    cargo-lambda
    cargo-udeps

    # Tunnelbroker + CMake
    c-ares_cmake-config
    cmake
    cmake-format # linting
    libuv
    localstack
    pkg-config
    protobuf3_21
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
    protobuf3_21
    corrosion # tunnelbroker
    double-conversion # tunnelbroker
    glog # tunnelbroker
    folly # cpp tools
    fmt # needed for folly
    boost # needed for folly
    olm # needed for CryptoTools
    sqlite # needed for sqlite database
    openssl # needed for grpc
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    CoreFoundation
    CoreServices
    Security
    # required until https://github.com/seanmonstar/reqwest/issues/2006 is resolved
    SystemConfiguration
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
  '' + ''

    # Render default configuration for keyserver
    $PRJ_ROOT/scripts/create_url_facts.sh

    # Ensure rustup tooling is installed
    $PRJ_ROOT/scripts/ensure_rustup_setup.sh

    # Provide decent bash prompt
    source "${better-prompt}/bin/better-prompt"

    $PRJ_ROOT/scripts/set-up-authoritative-keyserver.sh

    echo "Welcome to Comm dev environment! :)"
  '';
}
