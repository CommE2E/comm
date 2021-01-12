// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';

const productionServer = 'https://squadcal.org';
const localhostServer = 'http://localhost/comm';
const localhostServerFromAndroidEmulator = 'http://10.0.2.2/comm';
const natServer = 'http://192.168.1.4/comm';

function defaultURLPrefix() {
  if (!__DEV__) {
    return productionServer;
  } else if (Platform.OS === 'android') {
    // Uncomment below and update IP address if testing on physical device
    //return natServer;
    return localhostServerFromAndroidEmulator;
  } else if (Platform.OS === 'ios') {
    // Uncomment below and update IP address if testing on physical device
    //return natServer;
    return localhostServer;
  } else {
    invariant(false, 'unsupported platform');
  }
}

const serverOptions = [productionServer];
if (Platform.OS === 'android') {
  serverOptions.push(localhostServerFromAndroidEmulator);
} else {
  serverOptions.push(localhostServer);
}

const setCustomServer = 'SET_CUSTOM_SERVER';

export { defaultURLPrefix, serverOptions, natServer, setCustomServer };
