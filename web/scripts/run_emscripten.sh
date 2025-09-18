#!/usr/bin/env bash

set -Eeuo pipefail

if ! command -v emcc > /dev/null; then
  echo "Please install emscripten or run 'nix develop'" >&2
  exit 1
fi

# directories
SCRIPT_DIR=$(cd "$(dirname "$0")"; pwd -P)
NATIVE_CPP_DIR="${SCRIPT_DIR}/../../native/cpp/"
INPUT_DIR="${NATIVE_CPP_DIR}CommonCpp/DatabaseManagers/"
ENTITIES_DIR="${NATIVE_CPP_DIR}CommonCpp/DatabaseManagers/entities/"
SQLITE_DIR="${SCRIPT_DIR}/../shared-worker/sqlite/"
WEB_CPP_DIR="${SCRIPT_DIR}/../cpp/"
OUTPUT_DIR="${SCRIPT_DIR}/../shared-worker/_generated/"

# files
SQLITE_SOURCE="${SQLITE_DIR}sqlite3.c"
SQLITE_BITCODE_FILE="${SQLITE_DIR}sqlite3.bc"
OUTPUT_FILE_NAME="comm-query-executor"
OUTPUT_FILE="${OUTPUT_DIR}${OUTPUT_FILE_NAME}.js"

# OpenSSL resources
OPENSSL_VERSION="3.2.0"
OPENSSL_URL="https://www.openssl.org/source/openssl-${OPENSSL_VERSION}.tar.gz"
OPENSSL_FILE="${SQLITE_DIR}openssl-file"
OPENSSL_DIR="${SQLITE_DIR}openssl-${OPENSSL_VERSION}"
OPENSSL_HEADERS="${OPENSSL_DIR}/include"
OPENSSL_LIBCRYPTO="${OPENSSL_DIR}/libcrypto.a"

# SQLCipher resources
SQLCIPHER_AMALGAMATION_VERSION="4.5.5-d"
SQLCIPHER_AMALGAMATION="sqlcipher-amalgamation-${SQLCIPHER_AMALGAMATION_VERSION}"
SQLCIPHER_AMALGAMATION_URL="https://codeload.github.com/CommE2E/sqlcipher-amalgamation/zip/refs/tags/${SQLCIPHER_AMALGAMATION_VERSION}"
SQLCIPHER_AMALGAMATION_FILE="${SQLITE_DIR}${SQLCIPHER_AMALGAMATION}"

SQLITE_COMPILATION_FLAGS=(
 -Oz
 -DSQLITE_OMIT_LOAD_EXTENSION
 -DSQLITE_DISABLE_LFS
 -DSQLITE_ENABLE_FTS3
 -DSQLITE_ENABLE_FTS3_PARENTHESIS
 -DSQLITE_THREADSAFE=0
 -DSQLITE_ENABLE_NORMALIZE
 -DSQLITE_HAS_CODEC
 -DSQLITE_TEMP_STORE=2
 -DSQLCIPHER_CRYPTO_OPENSSL
 -DSQLITE_ENABLE_SESSION
 -DSQLITE_ENABLE_PREUPDATE_HOOK
 -DSQLITE_ENABLE_FTS5
)

download_openssl() {
  mkdir -p "$SQLITE_DIR"

  curl -L "${OPENSSL_URL}" --output "${OPENSSL_FILE}"

  tar -xf "${OPENSSL_FILE}" -C "${SQLITE_DIR}"
  rm -f "${OPENSSL_FILE}"
}

build_openssl() {
  pushd "${OPENSSL_DIR}"

  ./Configure \
    no-asm \
    no-async \
    no-egd \
    no-ktls \
    no-module \
    no-posix-io \
    no-secure-memory \
    no-dso \
    no-shared \
    no-sock \
    no-stdio \
    no-ui-console \
    no-weak-ssl-ciphers \
    no-engine \
    linux-generic32

  make CC="emcc" AR="emar" RANLIB="emranlib"

  popd
}

if [ ! -d "$OPENSSL_DIR" ]; then
    echo "OpenSSL sources not found. Downloading."
    download_openssl
fi

if [ ! -f "$OPENSSL_LIBCRYPTO" ]; then
    echo "OpenSSL binary not found. Building."
    build_openssl
fi

download_sqlite() {
  mkdir -p "$SQLITE_DIR"

  curl "${SQLCIPHER_AMALGAMATION_URL}" --output "${SQLCIPHER_AMALGAMATION_FILE}"

  unzip -jo "${SQLCIPHER_AMALGAMATION_FILE}" -d "${SQLITE_DIR}"
  rm -f "${SQLCIPHER_AMALGAMATION_FILE}"
}

if [ ! -f "$SQLITE_BITCODE_FILE" ]; then
    echo "SQLite engine not found. Downloading."
    download_sqlite

    emcc "${SQLITE_COMPILATION_FLAGS[@]}" \
      -I "${OPENSSL_HEADERS}" \
      -c "$SQLITE_SOURCE" \
      -o "$SQLITE_BITCODE_FILE"
fi


EMCC_FLAGS=(
  # WASM files and bindings
  -s WASM=1
  -s ALLOW_MEMORY_GROWTH=1
  -s ALLOW_TABLE_GROWTH=1
  -s FORCE_FILESYSTEM=1
  -s SINGLE_FILE=0
  -s EXPORTED_RUNTIME_METHODS=["FS"]
  -s WASM_BIGINT=1

  # node/babel/webpack helpers
  -s NODEJS_CATCH_EXIT=0
  -s NODEJS_CATCH_REJECTION=0
  -s WASM_ASYNC_COMPILATION=0
  -s EXPORT_ES6=1
  -s MODULARIZE=1

  # optimization
  -Oz
  -flto
  --closure 1
)

CFLAGS=(
  -I "$INPUT_DIR"
  -I "$SQLITE_DIR"
  -I "${NATIVE_CPP_DIR}CommonCpp/Tools/"
)

INPUT_FILES=(
  "${INPUT_DIR}SQLiteConnectionManager.cpp"
  "${WEB_CPP_DIR}SQLiteQueryExecutorBindings.cpp"
  "${WEB_CPP_DIR}Logger.cpp"
  "${ENTITIES_DIR}SQLiteDataConverters.cpp"
  "${ENTITIES_DIR}SQLiteStatementWrapper.cpp"
  "$SQLITE_BITCODE_FILE"
)

mkdir -p "$OUTPUT_DIR"

emcc -lembind \
  "${EMCC_FLAGS[@]}" \
  "${CFLAGS[@]}" \
  "${INPUT_FILES[@]}" \
  "${OPENSSL_LIBCRYPTO}" \
  -o "${OUTPUT_FILE}" \
  -std=c++17

GENERATED_TAG="generated"
sed -i.bak -e "1i\/\/ \@${GENERATED_TAG}" "${OUTPUT_FILE}"

mv -f "${OUTPUT_DIR}${OUTPUT_FILE_NAME}.wasm" "${OUTPUT_DIR}comm_query_executor.wasm"
rm -f "${OUTPUT_FILE}.bak"
