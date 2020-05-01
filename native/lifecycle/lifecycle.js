// @flow

import { AppState as NativeAppState } from 'react-native';

function addLifecycleListener(listener: (state: ?string) => mixed) {
  NativeAppState.addEventListener('change', listener);
  return {
    remove: () => {
      NativeAppState.removeEventListener('change', listener);
    },
  };
}

function getCurrentLifecycleState() {
  return NativeAppState.currentState;
}

export { addLifecycleListener, getCurrentLifecycleState };
