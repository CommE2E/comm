#!/usr/bin/env bash

set -e

echo "generating files from protos..."

for PROTO_FILE in $(ls ./protos); do
  protoc -I=./protos --cpp_out=_generated --grpc_out=_generated --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` ./protos/$PROTO_FILE
done

echo "success - code generated from protos"
