#!/bin/bash

set -e

echo "generating files from protos..."

protoc -I=./protos --cpp_out=_generated --grpc_out=_generated --plugin=protoc-gen-grpc=`which grpc_cpp_plugin` ./protos/blob.proto

echo "success - code generated from protos"
