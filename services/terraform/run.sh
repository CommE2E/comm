#!/bin/bash

set -e

terraform init

TF_VAR_HOST="http://localhost:4566" terraform apply -auto-approve
