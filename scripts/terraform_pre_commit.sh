#!/usr/bin/env bash

set -e

cd services/terraform/
echo "Formatting terraform..."
terraform fmt -recursive

for cfg in dev remote self-host; do
  pushd "$cfg" >/dev/null
  echo "Validating '$cfg' terraform configuration..."
  terraform validate
  popd >/dev/null
done

echo "Done formatting and validating terraform"
