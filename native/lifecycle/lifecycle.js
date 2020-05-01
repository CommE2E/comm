// @flow

import { Platform, AppState as NativeAppState } from 'react-native';

import { getLifecycleEventEmitter } from './lifecycle-event-emitter';

function addLifecycleListener(listener: (state: ?string) => mixed) {
  if (Platform.OS === 'android') {
    return getLifecycleEventEmitter().addLifecycleListener(listener);
  }

  NativeAppState.addEventListener('change', listener);
  return {
    remove: () => {
      NativeAppState.removeEventListener('change', listener);
    },
  };
}

function getCurrentLifecycleState() {
  return Platform.OS === 'android'
    ? getLifecycleEventEmitter().currentLifecycleStatus
    : NativeAppState.currentState;
}

export { addLifecycleListener, getCurrentLifecycleState };
