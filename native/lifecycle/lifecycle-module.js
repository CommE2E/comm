// @flow

import {
  requireNativeModule,
  NativeModulesProxy,
  EventEmitter,
} from 'expo-modules-core';

import type { EmitterSubscription } from '../types/react-native';

const AndroidLifecycleModule: {
  +PI: number,
  +hello: () => string,
  +setValueAsync: string => Promise<void>,
  ...
} = requireNativeModule('AndroidLifecycle');

export const PI = AndroidLifecycleModule.PI;

export function hello(): string {
  return AndroidLifecycleModule.hello();
}

export async function setValueAsync(value: string): Promise<void> {
  return await AndroidLifecycleModule.setValueAsync(value);
}

const emitter = new EventEmitter(
  AndroidLifecycleModule ?? NativeModulesProxy.AndroidLifecycle,
);

export function addChangeListener(
  listener: ({ +value: string }) => mixed,
): EmitterSubscription {
  return emitter.addListener('onChange', listener);
}
