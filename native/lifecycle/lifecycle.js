// @flow

import { Platform, AppState as NativeAppState } from 'react-native';

import { type LifecycleState } from 'lib/types/lifecycle-state-types';

import type { EventSubscription } from '../types/react-native';
import { getLifecycleEventEmitter } from './lifecycle-event-emitter';

function addLifecycleListener(
  listener: (state: ?LifecycleState) => void,
): EventSubscription {
  if (Platform.OS === 'android') {
    return getLifecycleEventEmitter().addLifecycleListener(listener);
  }

  return NativeAppState.addEventListener('change', listener);
}

function getCurrentLifecycleState(): ?string {
  return Platform.OS === 'android'
    ? getLifecycleEventEmitter().currentLifecycleStatus
    : NativeAppState.currentState;
}

export { addLifecycleListener, getCurrentLifecycleState };
