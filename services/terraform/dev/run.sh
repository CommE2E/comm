#!/usr/bin/env bash

set -e

terraform init

terraform apply -auto-approve
