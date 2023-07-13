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
SQLITE_DIR="${SCRIPT_DIR}/../database/sqlite/"
WEB_CPP_DIR="${SCRIPT_DIR}/../cpp/"
OUTPUT_DIR="${SCRIPT_DIR}/../database/_generated/"

# files
SQLITE_SOURCE="${SQLITE_DIR}sqlite3.c"
SQLITE_BITCODE_FILE="${SQLITE_DIR}sqlite3.bc"
OUTPUT_FILE_NAME="comm-query-executor"
OUTPUT_FILE="${OUTPUT_DIR}${OUTPUT_FILE_NAME}.js"

# SQLite resources
SQLITE_AMALGAMATION="sqlite-amalgamation-3390300"
SQLITE_AMALGAMATION_URL="https://www.sqlite.org/2022/${SQLITE_AMALGAMATION}.zip"
SQLITE_AMALGAMATION_FILE="${SQLITE_DIR}${SQLITE_AMALGAMATION}.zip"

SQLITE_COMPILATION_FLAGS=(
 -Oz
 -DSQLITE_OMIT_LOAD_EXTENSION
 -DSQLITE_DISABLE_LFS
 -DSQLITE_ENABLE_FTS3
 -DSQLITE_ENABLE_FTS3_PARENTHESIS
 -DSQLITE_THREADSAFE=0
 -DSQLITE_ENABLE_NORMALIZE
)

download_sqlite() {
  mkdir -p "$SQLITE_DIR"

  curl "${SQLITE_AMALGAMATION_URL}" --output "${SQLITE_AMALGAMATION_FILE}"

  unzip -jo "${SQLITE_AMALGAMATION_FILE}" -d "${SQLITE_DIR}"
  rm -f "${SQLITE_AMALGAMATION_FILE}"
}

if [ ! -f "$SQLITE_BITCODE_FILE" ]; then
    echo "SQLite engine not found. Downloading."
    download_sqlite

    emcc "${SQLITE_COMPILATION_FLAGS[@]}" \
      -c "$SQLITE_SOURCE" \
      -o "$SQLITE_BITCODE_FILE"
fi


EMCC_FLAGS=(
  # WASM files and bindings
  --memory-init-file 0
  -s WASM=1
  -s ALLOW_MEMORY_GROWTH=1
  -s ALLOW_TABLE_GROWTH=1
  -s FORCE_FILESYSTEM=1
  -s SINGLE_FILE=0
  -s EXPORTED_RUNTIME_METHODS=["FS"]

  # node/babel/webpack helpers
  -s NODEJS_CATCH_EXIT=0
  -s NODEJS_CATCH_REJECTION=0
  -s WASM_ASYNC_COMPILATION=0
  -s EXPORT_ES6=1
  -s USE_ES6_IMPORT_META=0
  -s MODULARIZE=1

  # optimization
  -Oz
  -flto
  --closure 1
)

CFLAGS=(
  -I "$INPUT_DIR"
  -I "$SQLITE_DIR"
  -I "${NATIVE_CPP_DIR}third-party/sqlite_orm/"
  -I "${NATIVE_CPP_DIR}CommonCpp/Tools/"
)

INPUT_FILES=(
  "${INPUT_DIR}CommQueryExecutor.cpp"
  "${INPUT_DIR}SQLiteQueryExecutor.cpp"
  "${WEB_CPP_DIR}Logger.cpp"
  "$SQLITE_BITCODE_FILE"
)

mkdir -p "$OUTPUT_DIR"

emcc -lembind \
  "${EMCC_FLAGS[@]}" \
  "${CFLAGS[@]}" \
  "${INPUT_FILES[@]}" \
  -o "${OUTPUT_FILE}" \
  -std=c++17

sed -i.bak -e '1i\/\/ \@generated' "${OUTPUT_FILE}"

mv -f "${OUTPUT_DIR}${OUTPUT_FILE_NAME}.wasm" "${OUTPUT_DIR}comm_query_executor.wasm"
