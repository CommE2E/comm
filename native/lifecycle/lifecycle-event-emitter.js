// @flow

import invariant from 'invariant';
import { Platform } from 'react-native';
import NativeEventEmitter from 'react-native/Libraries/EventEmitter/NativeEventEmitter';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import * as TurboModuleRegistry from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

import type { LifecycleState } from 'lib/types/lifecycle-state-types';

interface Spec extends TurboModule {
  +getConstants: () => {|
    initialStatus: string,
  |};
  +addListener: (eventName: string) => void;
  +removeListeners: (count: number) => void;
}
const AndroidLifecycle = (TurboModuleRegistry.getEnforcing<Spec>(
  'AndroidLifecycle',
): Spec);

class LifecycleEventEmitter extends NativeEventEmitter {
  currentLifecycleStatus: ?string;

  constructor() {
    super(AndroidLifecycle);
    this.currentLifecycleStatus = AndroidLifecycle.getConstants().initialStatus;
    this.addLifecycleListener(state => {
      this.currentAndroidLifecycle = state;
    });
  }

  addLifecycleListener = (listener: (state: ?LifecycleState) => mixed) => {
    return this.addListener('LIFECYCLE_CHANGE', event => {
      listener(event.status);
    });
  };
}

let lifecycleEventEmitter;
function getLifecycleEventEmitter() {
  if (lifecycleEventEmitter) {
    return lifecycleEventEmitter;
  }
  invariant(
    Platform.OS === 'android',
    'LifecycleEventEmitter only works on Android',
  );
  lifecycleEventEmitter = new LifecycleEventEmitter();
  return lifecycleEventEmitter;
}

export { getLifecycleEventEmitter };
