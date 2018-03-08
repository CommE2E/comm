// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';

const productionServer = "https://squadcal.org";
const localhostServer = "http://localhost/squadcal";
const localhostServerFromAndroidEmulator = "http://10.0.2.2/squadcal";
const natServer = "http://192.168.1.4/squadcal";

function defaultURLPrefix() {
  if (!__DEV__) {
    return productionServer;
  } else if (Platform.OS === "android") {
    return localhostServerFromAndroidEmulator;
    // Uncomment below and update IP address if testing on physical device
    //return natServer;
  } else if (Platform.OS === "ios") {
    return localhostServer;
    // Uncomment below and update IP address if testing on physical device
    //return natServer;
  } else {
    invariant(false, "unsupported platform");
  }
}

const serverOptions = [
  productionServer,
  natServer,
];
if (Platform.OS === "android") {
  serverOptions.push(localhostServerFromAndroidEmulator);
} else {
  serverOptions.push(localhostServer);
}

export {
  defaultURLPrefix,
  serverOptions,
}
