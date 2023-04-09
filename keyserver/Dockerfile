FROM node:16.18.0-bullseye

#-------------------------------------------------------------------------------
# STEP 0: SET UP USER
# Set up Linux user and group for the container
#-------------------------------------------------------------------------------

# We use bind mounts for our backups folder, which means Docker on Linux will
# blindly match the UID/GID for the backups folder on the container with the
# host. In order to make sure the container is able to create backups with the
# right UID/GID, we need to do two things:
# 1. Make sure that the user that runs the Docker container on the host has
#    permissions to write to the backups folder on the host. We rely on the host
#    to configure this properly
# 2. Make sure we're running this container with the same UID/GID that the host
#    is using, so the UID/GID show up correctly on both sides of the bind mount
# To handle 2 correctly, we have the host pass the UID/GID with which they're
# running the container. Our approach is based on this one:
# https://github.com/mhart/alpine-node/issues/48#issuecomment-430902787

ARG HOST_UID
ARG HOST_GID
ARG COMM_JSONCONFIG_secrets_alchemy
ARG COMM_JSONCONFIG_secrets_walletconnect
ARG COMM_JSONCONFIG_secrets_geoip_license

USER root
RUN \
  if [ -z "`getent group $HOST_GID`" ]; then \
    addgroup --system --gid $HOST_GID comm; \
  else \
    groupmod --new-name comm `getent group $HOST_GID | cut -d: -f1`; \
  fi && \
  if [ -z "`getent passwd $HOST_UID`" ]; then \
    adduser --system --uid $HOST_UID --ingroup comm --shell /bin/bash comm; \
  else \
    usermod --login comm --gid $HOST_GID --home /home/comm --move-home \
      `getent passwd $HOST_UID | cut -d: -f1`; \
  fi

#-------------------------------------------------------------------------------
# STEP 1: INSTALL PREREQS
# Install prereqs first so we don't have to reinstall them if anything changes
#-------------------------------------------------------------------------------

# We need to add the MariaDB repo to apt in order to install mariadb-client
RUN wget https://downloads.mariadb.com/MariaDB/mariadb_repo_setup \
  && chmod +x mariadb_repo_setup \
  && ./mariadb_repo_setup \
  && rm mariadb_repo_setup

# We need rsync in the prod-build yarn script
# We need mariadb-client so we can use mysqldump for backups
# We need cmake to install protobuf (prereq for rust-node-addon)
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  rsync \
  mariadb-client \
  cmake \
  && rm -rf /var/lib/apt/lists/*

# Install protobuf manually to ensure that we have the correct version
COPY scripts/install_protobuf.sh scripts/
RUN cd scripts && ./install_protobuf.sh

#-------------------------------------------------------------------------------
# STEP 2: DEVOLVE PRIVILEGES
# Create another user to run the rest of the commands
#-------------------------------------------------------------------------------

USER comm
WORKDIR /home/comm/app

#-------------------------------------------------------------------------------
# STEP 3: SET UP MYSQL BACKUPS
# Prepare the system to properly handle mysqldump backups
#-------------------------------------------------------------------------------

# Prepare the directory that will hold the backups
RUN mkdir /home/comm/backups

#-------------------------------------------------------------------------------
# STEP 4: SET UP CARGO (RUST PACKAGE MANAGER)
# We use Cargo to build pre-compiled Node.js addons in Rust
#-------------------------------------------------------------------------------

# Install Rust and add Cargo's bin directory to the $PATH environment variable
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH /home/comm/.cargo/bin:$PATH

#-------------------------------------------------------------------------------
# STEP 5: SET UP NVM
# We use nvm to make sure we're running the right Node version
#-------------------------------------------------------------------------------

# First we install nvm
ENV NVM_DIR /home/comm/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh \
  | bash

# Then we use nvm to install the right version of Node. We call this early so
# Docker build caching saves us from re-downloading Node when any file changes
COPY --chown=comm keyserver/.nvmrc keyserver/
COPY --chown=comm keyserver/bash/source-nvm.sh keyserver/bash/
RUN cd keyserver && . bash/source-nvm.sh

#-------------------------------------------------------------------------------
# STEP 6: YARN CLEANINSTALL
# We run yarn cleaninstall before copying most of the files in for build caching
#-------------------------------------------------------------------------------

# Copy in package.json files, yarn.lock files, and relevant installation scripts
COPY --chown=comm package.json yarn.lock postinstall.sh ./
COPY --chown=comm keyserver/package.json keyserver/.flowconfig keyserver/
COPY --chown=comm lib/package.json lib/.flowconfig lib/
COPY --chown=comm web/package.json web/.flowconfig web/
COPY --chown=comm native/package.json native/.flowconfig native/
COPY --chown=comm landing/package.json landing/.flowconfig landing/
COPY --chown=comm desktop/package.json desktop/
COPY --chown=comm keyserver/addons/rust-node-addon/package.json \
  keyserver/addons/rust-node-addon/install_ci_deps.sh \
  keyserver/addons/rust-node-addon/postinstall.sh \
  keyserver/addons/rust-node-addon/
COPY --chown=comm native/expo-modules/android-lifecycle/package.json \
  native/expo-modules/android-lifecycle/
COPY --chown=comm native/expo-modules/aes-crypto/package.json \
  native/expo-modules/aes-crypto/
COPY --chown=comm services/electron-update-server/package.json \
  services/electron-update-server/

# Create empty Rust library and copy in Cargo.toml file
RUN cargo init keyserver/addons/rust-node-addon --lib
COPY --chown=comm keyserver/addons/rust-node-addon/Cargo.toml \
  keyserver/addons/rust-node-addon/

# Copy in local dependencies of rust-node-addon
COPY --chown=comm shared/comm-opaque shared/comm-opaque/
COPY --chown=comm shared/tunnelbroker-client shared/tunnelbroker-client/

# Copy protobuf files as a dependency for the shared client libraries
COPY --chown=comm shared/protos shared/protos/

# Copy in files needed for patch-package
COPY --chown=comm patches patches/

# Actually run yarn
RUN yarn cleaninstall

#-------------------------------------------------------------------------------
# STEP 7: GEOIP UPDATE
# We update the GeoIP database for mapping from IP address to timezone
#-------------------------------------------------------------------------------

COPY --chown=comm keyserver/bash/docker-update-geoip.sh keyserver/bash/
RUN cd keyserver && bash/docker-update-geoip.sh

#-------------------------------------------------------------------------------
# STEP 8: WEBPACK BUILD
# We do this first so Docker doesn't rebuild when only keyserver files change
#-------------------------------------------------------------------------------

# These are needed for babel-build-comm-config
COPY --chown=comm keyserver/src keyserver/src
COPY --chown=comm keyserver/bash/source-nvm.sh keyserver/bash/source-nvm.sh
COPY --chown=comm keyserver/babel.config.cjs keyserver/babel.config.cjs

COPY --chown=comm lib lib/

COPY --chown=comm landing landing/
RUN yarn workspace landing prod

COPY --chown=comm web web/
RUN yarn workspace web prod

#-------------------------------------------------------------------------------
# STEP 9: COPY IN SOURCE FILES
# We run this later so the above layers are cached if only source files change
#-------------------------------------------------------------------------------

COPY --chown=comm . .

#-------------------------------------------------------------------------------
# STEP 10: BUILD NODE ADDON
# Now that source files have been copied in, build rust-node-addon
#-------------------------------------------------------------------------------

RUN yarn workspace rust-node-addon build

#-------------------------------------------------------------------------------
# STEP 11: RUN BUILD SCRIPTS
# We need to populate keyserver/dist, among other things
#-------------------------------------------------------------------------------

# Babel transpilation of keyserver src
RUN yarn workspace keyserver prod-build

#-------------------------------------------------------------------------------
# STEP 12: RUN THE SERVER
# Actually run the Node.js keyserver using nvm
#-------------------------------------------------------------------------------

EXPOSE 3000
WORKDIR /home/comm/app/keyserver
CMD bash/run-prod.sh
