// @flow

import { Platform, AppState as NativeAppState } from 'react-native';

import { type LifecycleState } from 'lib/types/lifecycle-state-types';

import { getLifecycleEventEmitter } from './lifecycle-event-emitter';

function addLifecycleListener(listener: (state: ?LifecycleState) => mixed) {
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
