// @flow

import {
  requireNativeModule,
  NativeModulesProxy,
  EventEmitter,
} from 'expo-modules-core';
import invariant from 'invariant';
import { Platform } from 'react-native';

import type { EmitterSubscription } from '../types/react-native';

type Active = 'active';
type Background = 'background';
type LifecycleStatus = Active | Background;

let AndroidLifecycleModule: ?{
  +ACTIVE: Active,
  +BACKGROUND: Background,
  +initialStatus: LifecycleStatus,
  ...
};
let emitter;
if (Platform.OS === 'android') {
  AndroidLifecycleModule = requireNativeModule('AndroidLifecycle');
  emitter = new EventEmitter(
    AndroidLifecycleModule ?? NativeModulesProxy.AndroidLifecycle,
  );
}

export const ACTIVE: ?Active = AndroidLifecycleModule?.ACTIVE;
export const BACKGROUND: ?Background = AndroidLifecycleModule?.BACKGROUND;
export const initialStatus: ?LifecycleStatus =
  AndroidLifecycleModule?.initialStatus;

export function addAndroidLifecycleListener(
  listener: (state: LifecycleStatus) => mixed,
): EmitterSubscription {
  invariant(
    Platform.OS === 'android' && emitter,
    'Only Android should call addAndroidLifecycleListener',
  );
  return emitter.addListener('LIFECYCLE_CHANGE', ({ status }) =>
    listener(status),
  );
}
