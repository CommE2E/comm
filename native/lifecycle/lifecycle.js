// @flow

import { Platform, AppState as NativeAppState } from 'react-native';

import { type LifecycleState } from 'lib/types/lifecycle-state-types.js';

import type { EventSubscription } from '../types/react-native.js';
import {
  addAndroidLifecycleListener,
  initialStatus,
} from './lifecycle-module.js';

let currentLifecycleStatus = initialStatus;
if (Platform.OS === 'android') {
  addAndroidLifecycleListener(state => {
    currentLifecycleStatus = state;
  });
}

function addLifecycleListener(
  listener: (state: ?LifecycleState) => void,
): EventSubscription {
  if (Platform.OS === 'android') {
    return addAndroidLifecycleListener(listener);
  }

  return NativeAppState.addEventListener('change', listener);
}

function getCurrentLifecycleState(): ?string {
  return Platform.OS === 'android'
    ? currentLifecycleStatus
    : NativeAppState.currentState;
}

export { addLifecycleListener, getCurrentLifecycleState };
