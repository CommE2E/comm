#!/bin/bash

set -x
# cd to Cargo project
cd "${SRCROOT}/../cpp/CommonCpp/grpc/grpc_client" || exit
# Remove the generated files from root of Cargo project
rm lib.rs.cc
