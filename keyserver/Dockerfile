FROM node:16.13-bullseye

#-------------------------------------------------------------------------------
# STEP 0: INSTALL PREREQS
# Install prereqs first so we don't have to reinstall them if anything changes
#-------------------------------------------------------------------------------

# We use rsync in the prod-build yarn script
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  rsync \
  && rm -rf /var/lib/apt/lists/*

#-------------------------------------------------------------------------------
# STEP 1: DEVOLVE PRIVILEGES
# Create another user to run the rest of the commands
#-------------------------------------------------------------------------------

RUN useradd -m comm
USER comm
WORKDIR /home/comm/app

#-------------------------------------------------------------------------------
# STEP 2: INSTALL NVM
# We use nvm to make sure we're running the right Node version
#-------------------------------------------------------------------------------

ENV NVM_DIR /home/comm/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh \
  | bash

#-------------------------------------------------------------------------------
# STEP 3: YARN CLEANINSTALL
# We run yarn cleaninstall before copying most of the files in for build caching
#-------------------------------------------------------------------------------

# Copy in package.json and yarn.lock files
COPY --chown=comm package.json yarn.lock .
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
# STEP 4: WEBPACK BUILD
# We do this first so Docker doesn't rebuild when only keyserver files change
#-------------------------------------------------------------------------------

COPY --chown=comm lib lib/
COPY --chown=comm landing landing/
RUN yarn workspace landing prod

COPY --chown=comm web web/
RUN yarn workspace web prod

#-------------------------------------------------------------------------------
# STEP 5: COPY IN SOURCE FILES
# We run this later so the above layers are cached if only source files change
#-------------------------------------------------------------------------------

COPY --chown=comm . .

#-------------------------------------------------------------------------------
# STEP 6: RUN BUILD SCRIPTS
# We need to populate keyserver/dist, among other things
#-------------------------------------------------------------------------------

# Babel transpilation of keyserver src
RUN yarn workspace keyserver prod-build

#-------------------------------------------------------------------------------
# STEP 7: RUN THE SERVER
# Actually run the Node.js keyserver using nvm
#-------------------------------------------------------------------------------

EXPOSE 3000
WORKDIR /home/comm/app/keyserver
CMD bash/run-prod.sh
