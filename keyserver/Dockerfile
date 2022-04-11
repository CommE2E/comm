FROM node:16.13-bullseye

WORKDIR /app

# We need python2 for a build script that the sqlite3 npm package uses
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
  python2 \
  && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --install /usr/bin/python python /usr/bin/python2 2

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

# We run yarn cleaninstall before copying most of the files in for build caching
RUN yarn cleaninstall
