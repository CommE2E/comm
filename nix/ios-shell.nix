{ mkShellNoCC
, stdenv
, lib
, arcanist
, better-prompt
, c-ares_cmake-config
, cmake
, cmake-format
, cocoapods
, corrosion
, cryptopp
, darwin
, libiconv
, mariadb
, mariadb-up
, nodejs-16_x-openssl_1_1
, protobuf_3_15_cmake
, redis
, redis-up
, rustup
, shellcheck
, sqlite
, terraform
, watchman
, rustfmt
, yarn
}:

mkShellNoCC {

  # programs which are meant to be executed should go here
  nativeBuildInputs = [
    # generic development or tools
    arcanist
    shellcheck
    terraform

    # node development
    mariadb
    nodejs-16_x-openssl_1_1
    yarn
    watchman # react native
    redis

    # native dependencies
    # C/CXX toolchains are already brought in with mkShell
    # Identity Service
    rustfmt
    rustup

    # Tunnelbroker + CMake
    cmake
    cmake-format # linting

    protobuf_3_15_cmake
  ] ++ lib.optionals stdenv.isDarwin [
    cocoapods # needed for ios
  ];

  # include any libraries buildInputs
  buildInputs = [
    # protobuf exposes both a library and a command
    # thus should appear in both inputs
    protobuf_3_15_cmake
    sqlite # needed for sqlite_orm
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    CoreFoundation
    CoreServices
    Security
    libiconv  # identity service
  ]);

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
  '' + ''

    # Provide decent bash prompt
    source "${better-prompt}/bin/better-prompt"

    # Restore BSD versions of common commands
    export PATH=/usr/bin:$PATH

    echo "Welcome to Comm dev environment! :)"
  '';
}
