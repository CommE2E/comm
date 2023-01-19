FROM node:16.18.0-bullseye

WORKDIR /home/comm/

COPY package.json yarn.lock postinstall.sh ./
COPY patches patches/

COPY package.json yarn.lock postinstall.sh ./
COPY lib/package.json lib/.flowconfig lib/
COPY native/package.json native/.flowconfig native/
COPY native/expo-modules/android-lifecycle/package.json \
  native/expo-modules/android-lifecycle/
COPY services/electron-update-server/package.json \
  services/electron-update-server/

RUN yarn install --frozen-lockfile

COPY services/electron-update-server services/electron-update-server/

EXPOSE 80

WORKDIR /home/comm/services/electron-update-server
CMD ["yarn", "run", "prod"]
