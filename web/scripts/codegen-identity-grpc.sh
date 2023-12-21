#!/usr/bin/env bash

set -Eeuo pipefail

PROTO_PATH="../shared/protos/"

OUTPUT_DIR="protobufs"

protoc -I=$PROTO_PATH identity_unauthenticated.proto identity_authenticated.proto \
  --js_out=import_style=commonjs:$OUTPUT_DIR \
  --grpc-web_out=import_style=commonjs+dts,mode=grpcwebtext:$OUTPUT_DIR

mv $OUTPUT_DIR/identity_unauthenticated_pb.js \
   $OUTPUT_DIR/identity-unauth-structs.cjs
mv $OUTPUT_DIR/identity_unauthenticated_grpc_web_pb.js \
   $OUTPUT_DIR/identity-unauthenticated.cjs
mv $OUTPUT_DIR/identity_unauthenticated_pb.d.ts \
   $OUTPUT_DIR/identity-unauth-structs.cjs.flow
mv $OUTPUT_DIR/identity_unauthenticated_grpc_web_pb.d.ts \
   $OUTPUT_DIR/identity-unauthenticated.cjs.flow
mv $OUTPUT_DIR/identity_authenticated_pb.js \
   $OUTPUT_DIR/identity-auth-structs.cjs
mv $OUTPUT_DIR/identity_authenticated_grpc_web_pb.js \
   $OUTPUT_DIR/identity-auth-client.cjs
mv $OUTPUT_DIR/identity_authenticated_pb.d.ts \
   $OUTPUT_DIR/identity-auth-structs.cjs.flow
mv $OUTPUT_DIR/identity_authenticated_grpc_web_pb.d.ts \
   $OUTPUT_DIR/identity-auth-client.cjs.flow

# This echo statement splits the string to ensure that Phabricator shows this file in reviews
echo "Make sure to edit the files to correct import paths, reintroduce @""generated annotation, and convert TS to Flow!"
