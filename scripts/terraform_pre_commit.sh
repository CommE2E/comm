#!/usr/bin/env bash

set -e

cd services/terraform
echo "formatting services/terraform..."
terraform fmt -check
echo "validating services/terraform..."
terraform validate
echo "done formatting and validating"
