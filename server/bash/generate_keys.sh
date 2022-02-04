#!/bin/bash

ENCRYPTION_KEY_LENGTH=64
OLM_CONFIG_REL_PATH=./secrets/olm_config.json

private_key=$(cat /dev/random | base64 | head -c $ENCRYPTION_KEY_LENGTH)
public_key=$(cat /dev/random | base64 | head -c $ENCRYPTION_KEY_LENGTH)

olm_config_content=$'{"privateKey": "'"$private_key"'", "publicKey": "'"$public_key"'"}'

echo $olm_config_content > $OLM_CONFIG_REL_PATH
