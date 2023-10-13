#!/usr/bin/env bash

set -Eeuo pipefail

protoc -I=../shared/protos/ identity_client.proto --js_out=import_style=commonjs:protobufs --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:protobufs

mv protobufs/identity_client_pb.js protobufs/identity-structs.cjs
mv protobufs/identity_client_grpc_web_pb.js protobufs/identity-client.cjs
mv protobufs/identity_client_pb.d.ts protobufs/identity-structs.cjs.flow
mv protobufs/identity_client_grpc_web_pb.d.ts protobufs/identity-client.cjs.flow

echo "Make sure to edit the files to correct import paths, reintroduce @generated annotation, and convert TS to Flow!"
