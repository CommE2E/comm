// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';

function defaultURLPrefix() {
  if (!__DEV__) {
    return "https://squadcal.org/";
  } else if (Platform.OS === "android") {
    // This is a magic IP address that forwards to the emulator's host
    return "http://10.0.2.2/squadcal/";
    // Uncomment below and update IP address if testing on physical device
    //return "http://192.168.1.4/squadcal/";
  } else if (Platform.OS === "ios") {
    // Since iOS is simulated and not emulated, we can use localhost
    return "http://localhost/squadcal/";
    // Uncomment below and update IP address if testing on physical device
    //return "http://192.168.1.4/squadcal/";
  } else {
    invariant(false, "unsupported platform");
  }
}

export {
  defaultURLPrefix,
}
