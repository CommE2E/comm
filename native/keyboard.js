// @flow

import { AppState, Keyboard, Platform } from 'react-native';

export type KeyboardEvent = {
  duration: number,
  endCoordinates: {
    width: number,
    height: number,
    screenX: number,
    screenY: number,
  },
};
type KeyboardCallback = (event: KeyboardEvent) => void;

let currentState = AppState.currentState;
function handleAppStateChange(nextAppState: ?string) {
  currentState = nextAppState;
}

let listenersEnabled = 0;
let appStateListener = null;
function incrementAppStateListeners() {
  if (!listenersEnabled++) {
    currentState = AppState.currentState;
    appStateListener = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
  }
}
function decrementAppStateListeners() {
  if (!--listenersEnabled && appStateListener) {
    AppState.removeEventListener('change', appStateListener);
    appStateListener = null;
  }
}

function callCallbackIfAppActive(callback: KeyboardCallback): KeyboardCallback {
  return (event: KeyboardEvent) => {
    if (this.currentState === "active") {
      callback(event);
    }
  }
}
function addKeyboardShowListener(callback: KeyboardCallback) {
  incrementAppStateListeners();
  return Keyboard.addListener(
    Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
    callCallbackIfAppActive(callback),
  );
}
function addKeyboardDismissListener(callback: KeyboardCallback) {
  incrementAppStateListeners();
  return Keyboard.addListener(
    Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
    callCallbackIfAppActive(callback),
  );
}
function removeKeyboardListener(listener: { remove: () => void }) {
  decrementAppStateListeners();
  listener.remove();
}

export {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
};
