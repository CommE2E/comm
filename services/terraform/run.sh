#!/bin/bash

set -e

terraform init

terraform apply -auto-approve
