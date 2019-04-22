// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';

// Will crash if not Android
let cachedFirebase = null;
function getFirebase() {
  if (cachedFirebase !== null) {
    return cachedFirebase;
  }
  invariant(
    Platform.OS === "android",
    "react-native-firebase only used on Android at the moment",
  );
  cachedFirebase = require('react-native-firebase');
  return cachedFirebase;
}

export {
  getFirebase,
};
