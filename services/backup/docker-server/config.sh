#/bin/bash

set -e

# this script should be run from the comm's root directory

IMAGE_NAME="commapp/backup-server"
VERSION="1.0"
EXTRA_ARGS="-v $HOME/.aws/credentials:/root/.aws/credentials:ro"
