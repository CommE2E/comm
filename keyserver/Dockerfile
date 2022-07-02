FROM node:16.13-bullseye

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

# We add Debian's unstable repo since it's the only way to get mysqldump
RUN echo "deb http://deb.debian.org/debian unstable main non-free contrib" \
  >> /etc/apt/sources.list

# We need rsync in the prod-build yarn script
# We need mysql-client so we can use mysqldump for backups
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  rsync \
  mysql-client \
  && rm -rf /var/lib/apt/lists/*

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

# We install mysql-client 8.0 above but use it with MySQL 5.7. Unfortunately,
# we haven't been able to figure out a way to install mysql-client 5.7 on
# Debian bullseye. Instead, we configure mysqldump 8.0 to work with MySQL 5.7
RUN echo "[mysqldump]\ncolumn-statistics=0" > /home/comm/.my.cnf

#-------------------------------------------------------------------------------
# STEP 4: SET UP NVM
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
RUN cd keyserver/bash && ./source-nvm.sh

#-------------------------------------------------------------------------------
# STEP 5: YARN CLEANINSTALL
# We run yarn cleaninstall before copying most of the files in for build caching
#-------------------------------------------------------------------------------

# Copy in package.json and yarn.lock files
COPY --chown=comm package.json yarn.lock ./
COPY --chown=comm keyserver/package.json keyserver/.flowconfig keyserver/
COPY --chown=comm lib/package.json lib/.flowconfig lib/
COPY --chown=comm web/package.json web/.flowconfig web/
COPY --chown=comm native/package.json native/.flowconfig native/
COPY --chown=comm landing/package.json landing/.flowconfig landing/

# Copy in files needed for patch-package and pod-patch
COPY --chown=comm patches patches/
COPY --chown=comm native/ios/pod-patch native/ios/pod-patch/
COPY --chown=comm native/ios/Podfile native/ios/

# Actually run yarn
RUN yarn cleaninstall

#-------------------------------------------------------------------------------
# STEP 6: WEBPACK BUILD
# We do this first so Docker doesn't rebuild when only keyserver files change
#-------------------------------------------------------------------------------

COPY --chown=comm lib lib/
COPY --chown=comm landing landing/
RUN yarn workspace landing prod

COPY --chown=comm web web/
RUN yarn workspace web prod

#-------------------------------------------------------------------------------
# STEP 7: COPY IN SOURCE FILES
# We run this later so the above layers are cached if only source files change
#-------------------------------------------------------------------------------

COPY --chown=comm . .

#-------------------------------------------------------------------------------
# STEP 8: RUN BUILD SCRIPTS
# We need to populate keyserver/dist, among other things
#-------------------------------------------------------------------------------

# Babel transpilation of keyserver src
RUN yarn workspace keyserver prod-build

#-------------------------------------------------------------------------------
# STEP 9: RUN THE SERVER
# Actually run the Node.js keyserver using nvm
#-------------------------------------------------------------------------------

EXPOSE 3000
WORKDIR /home/comm/app/keyserver
CMD bash/run-prod.sh
