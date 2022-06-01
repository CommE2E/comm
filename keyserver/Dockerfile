FROM node:16.13-bullseye

WORKDIR /app

#-------------------------------------------------------------------------------
# STEP 0: INSTALL PREREQS
# Install prereqs first so we don't have to reinstall them if anything changes
#-------------------------------------------------------------------------------

# We use rsync in the prod-build yarn script
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  rsync \
  && rm -rf /var/lib/apt/lists/*

# We use nvm to make sure we're running the right Node version
ENV NVM_DIR /root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh \
  | bash

#-------------------------------------------------------------------------------
# STEP 1: YARN CLEANINSTALL
# We run yarn cleaninstall before copying most of the files in for build caching
#-------------------------------------------------------------------------------

# Copy in package.json and yarn.lock files
COPY package.json yarn.lock .
COPY keyserver/package.json keyserver/.flowconfig keyserver/
COPY lib/package.json lib/.flowconfig lib/
COPY web/package.json web/.flowconfig web/
COPY native/package.json native/.flowconfig native/
COPY landing/package.json landing/.flowconfig landing/

# Copy in files needed for patch-package and pod-patch
COPY patches patches/
COPY native/ios/pod-patch native/ios/pod-patch/
COPY native/ios/Podfile native/ios/

# Actually run yarn
RUN yarn cleaninstall

#-------------------------------------------------------------------------------
# STEP 2: WEBPACK BUILD
# We do this first so Docker doesn't rebuild when only keyserver files change
#-------------------------------------------------------------------------------

COPY lib lib/
COPY landing landing/
RUN yarn workspace landing prod

COPY web web/
RUN yarn workspace web prod

#-------------------------------------------------------------------------------
# STEP 3: COPY IN SOURCE FILES
# We run this later so the above layers are cached if only source files change
#-------------------------------------------------------------------------------

COPY . .

#-------------------------------------------------------------------------------
# STEP 4: RUN BUILD SCRIPTS
# We need to populate keyserver/dist, among other things
#-------------------------------------------------------------------------------

# Babel transpilation of keyserver src
RUN yarn workspace keyserver prod-build

#-------------------------------------------------------------------------------
# STEP 5: RUN THE SERVER
# Actually run the Node.js keyserver using nvm
#-------------------------------------------------------------------------------

EXPOSE 3000
WORKDIR /app/keyserver
CMD bash/run-prod.sh
