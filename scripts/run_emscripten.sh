#!/bin/bash

# This should also download sqlite-engine, I've done it manually for now


SHARED_FLAGS="-s WASM=1 -s MODULARIZE=1 -s EXCEPTION_CATCHING_ALLOWED=[..] -s NO_DISABLE_EXCEPTION_CATCHING -s WASM_ASYNC_COMPILATION=0 -s EXPORT_ES6=1"


# Set directory paths
INPUT_DIR="../native/cpp/CommonCpp/DatabaseManagers"
OUTPUT_DIR="../web/database/_generated/"

# create output directory
mkdir -p $OUTPUT_DIR
mkdir -p $OUTPUT_DIR/llvm

EMCC=emcc

SQLITE_COMPILATION_FLAGS="
  -Oz
	-DSQLITE_OMIT_LOAD_EXTENSION
	-DSQLITE_DISABLE_LFS
	-DSQLITE_ENABLE_FTS3
	-DSQLITE_ENABLE_FTS3_PARENTHESIS
	-DSQLITE_THREADSAFE=0
	-DSQLITE_ENABLE_NORMALIZE
"

BITCODE_FILES=$OUTPUT_DIR/sqlite3.bc

# compile engine to byte code
$EMCC $SQLITE_COMPILATION_FLAGS -c $INPUT_DIR/sqlite3.c -o $BITCODE_FILES

LIBRARIES="
  -I $INPUT_DIR/
  -I ../native/cpp/third-party/sqlite_orm/
  -I ../native/cpp/CommonCpp/Tools/
"

INPUT_FILES="
 ../native/cpp/CommonCpp/DatabaseManagers/CommQueryCreator.cpp
 ../native/cpp/CommonCpp/DatabaseManagers/SQLiteQueryExecutor.cpp
"

# helps with making this working with babel/webpack/jest
EM_ES_FLAGS="
  -s NODEJS_CATCH_EXIT=0
  -s NODEJS_CATCH_REJECTION=0
  -s WASM_ASYNC_COMPILATION=0
  -s EXPORT_ES6=1
  -s USE_ES6_IMPORT_META=0
  -s MODULARIZE=1
"

# general things
EM_FLAGS="
  --memory-init-file 0
  -s RESERVED_FUNCTION_POINTERS=64
  -s ALLOW_TABLE_GROWTH=1
  -s EXCEPTION_CATCHING_ALLOWED=[..]
  -s NO_DISABLE_EXCEPTION_CATCHING
"

# responsible for optimization
EM_FLAGS_OPTIMIZED="
  -Oz
  -flto
  --closure 1
"

# related to WASM file/bindings
EM_FLAGS_WASM="
  -s WASM=1
  -s ALLOW_MEMORY_GROWTH=1
  -sFORCE_FILESYSTEM
  -s FORCE_FILESYSTEM=1
  -s EXPORTED_RUNTIME_METHODS=["FS"]
  -s SINGLE_FILE=0
"


$EMCC -lembind $EM_FLAGS $EM_ES_FLAGS $EM_FLAGS_OPTIMIZED $EM_FLAGS_WASM $BITCODE_FILES $LIBRARIES $INPUT_FILES -o $OUTPUT_DIR/CommQueryCreator.js


