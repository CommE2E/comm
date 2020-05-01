// @flow

import {
  Platform,
  AppState as NativeAppState,
  DeviceEventEmitter,
  NativeModules,
} from 'react-native';

function addLifecycleListener(listener: (state: ?string) => mixed) {
  if (Platform.OS === 'android') {
    return DeviceEventEmitter.addListener('LIFECYCLE_CHANGE', event => {
      listener(event.status);
    });
  }

  NativeAppState.addEventListener('change', listener);
  return {
    remove: () => {
      NativeAppState.removeEventListener('change', listener);
    },
  };
}

let currentAndroidLifecycle;
if (Platform.OS === 'android') {
  currentAndroidLifecycle = NativeModules.AndroidLifecycle.getConstants()
    .initialStatus;
  addLifecycleListener(state => {
    currentAndroidLifecycle = state;
  });
}

function getCurrentLifecycleState() {
  return Platform.OS === 'android'
    ? currentAndroidLifecycle
    : NativeAppState.currentState;
}

export { addLifecycleListener, getCurrentLifecycleState };
