#!/usr/bin/env bash

# run as: ssh user on root wheel
# run from: wherever
# param: path to link to

# The maximum amount of space to spend on checkouts. By default we leave around
# old deployments in case we want to roll back. The limit includes the current
# prod checkout, but will never delete prod.
MAX_DISK_USAGE_KB=3145728 # 3 GiB

# The user that spawns the Node server
DAEMON_USER=comm

# Input to git clone
GIT_CLONE_PARAMS=https://github.com/CommE2E/comm.git

set -e
[[ `whoami` = root ]] || exec sudo su -c "$0 $1"

# STEP 1: clone source into new directory
CHECKOUT_PATH=$1.$(date +%F-%H-%M)
rm -rf "$CHECKOUT_PATH" # badass. risky
mkdir -p "$CHECKOUT_PATH"
chown $DAEMON_USER:$DAEMON_USER "$CHECKOUT_PATH"
su $DAEMON_USER -c "git clone $GIT_CLONE_PARAMS '$CHECKOUT_PATH'"
su $DAEMON_USER -c "cp -r '$1'/keyserver/secrets '$CHECKOUT_PATH'/keyserver/secrets"
su $DAEMON_USER -c "cp -r '$1'/keyserver/facts '$CHECKOUT_PATH'/keyserver/facts"
cd "$CHECKOUT_PATH"
su $DAEMON_USER -c "keyserver/bash/setup.sh"

# STEP 2: test if the binary crashes within 60 seconds
set +e
su $DAEMON_USER -c "cd keyserver && PORT=3001 timeout 60 bash/run-prod.sh"
[[ $? -eq 124 ]] || exit 1
set -e

# STEP 3: flip it over
systemctl stop comm || true
rm "$1"
ln -s "$CHECKOUT_PATH" "$1"
chown -h $DAEMON_USER:$DAEMON_USER "$1"
systemctl restart comm

# STEP 4: clean out old checkouts
checkouts=($(ls -dtr "$1".*))
for checkout in "${checkouts[@]}"; do
  if [[ "$checkout" = "$CHECKOUT_PATH" ]]; then
    break
  fi
  TOTAL_USAGE=$(sudo du -cs $1* | grep total | awk '{ print $1 }')
  if [[ $TOTAL_USAGE -le $MAX_DISK_USAGE_KB ]]; then
    break
  fi
  rm -rf "$checkout"
done
