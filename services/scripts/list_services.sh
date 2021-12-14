#!/bin/bash

set -e

ls | grep -vE 'base-image|docker.compose.yml|package.json|scripts'
