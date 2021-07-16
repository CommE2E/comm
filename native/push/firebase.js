// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import type { App as FirebaseModule } from 'react-native-firebase';

// Will crash if not Android
let cachedFirebase: FirebaseModule | null = null;
function getFirebase(): FirebaseModule {
  if (cachedFirebase !== null) {
    return cachedFirebase;
  }
  invariant(
    Platform.OS === 'android',
    'react-native-firebase only used on Android at the moment',
  );
  const module: FirebaseModule = (require('react-native-firebase'): any);
  cachedFirebase = module;
  return cachedFirebase;
}

export { getFirebase };
