#!/bin/bash

TAG=$1

docker build --platform linux/amd64 -f services/identity/Dockerfile -t commapp/identity-server:"$TAG" . && docker push commapp/identity-server:"$TAG"
