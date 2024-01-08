#!/usr/bin/env bash

set -Eeuo pipefail

GENERATED_PROTOS_DIR="web/protobufs"

# We need the script to be run from the root of the 'web' directory
pushd "$(dirname "$0")/../web" >/dev/null
#shellcheck disable=SC1091
. ./scripts/codegen-identity-grpc.sh
popd >/dev/null

for file in "$GENERATED_PROTOS_DIR"/*.cjs; do
  # Renames ./identity_client_pb.js to ./identity-structs.cjs
  sed -i 's/\.\/identity_unauth_pb\.js/\.\/identity-unauth-structs\.cjs/g' "$file"
  # Renames ./identity_authenticated_pb.js to ./identity-auth-structs.cjs
  sed -i 's/\.\/identity_auth_pb\.js/\.\/identity-auth-structs\.cjs/g' "$file"
  # if the @generated annotation doesn't exist, add it
  if ! grep -q '@generated' "$file"; then
    # Adds @generated below @public up to first occurrence of @public
    sed -i -e '0,/@public/s/@public/@public\n * @generated/' "$file"
  fi

  # CI-related renames due to environment differences.
  # Replace all in-comment versions with these given below.
  # // 	protoc-gen-grpc-web v1.4.2
  # // 	protoc              v3.21.12
  sed -i 's/protoc-gen-grpc-web v.*$/protoc-gen-grpc-web v1.4.2/g' "$file"
  sed -i 's/protoc              v.*$/protoc              v3.21.12/g' "$file"

  # Codegen adds one blank line, causing eslint failure
  # we can auto-fix this
  yarn eslint --fix "$file"
done

if ! git diff --exit-code -- $GENERATED_PROTOS_DIR/*.cjs; then
  echo "gRPC-web generated files differ!"
  exit 1
fi
