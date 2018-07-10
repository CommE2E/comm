// @flow

import { AppState, Keyboard, Platform } from 'react-native';

type ScreenRect = $ReadOnly<{|
  screenX: number,
  screenY: number,
  width: number,
  height: number,
|}>;
export type KeyboardEvent = $ReadOnly<{|
  duration?: number,
  easing?: string,
  endCoordinates: ScreenRect,
  startCoordinates?: ScreenRect,
|}>;
type KeyboardCallback = (event: KeyboardEvent) => void;
type IgnoredKeyboardEvent = {|
  callback: KeyboardCallback,
  event: KeyboardEvent,
  time: number,
|};
export type EmitterSubscription = {
  +remove: () => void,
};
// If the app becomes active within 500ms after a keyboard event is triggered,
// we will call the relevant keyboard callbacks.
const appStateChangeDelay = 500;

let currentState = AppState.currentState;
let recentIgnoredKeyboardEvents: IgnoredKeyboardEvent[] = [];
function handleAppStateChange(nextAppState: ?string) {
  currentState = nextAppState;

  const time = Date.now();
  const ignoredEvents = recentIgnoredKeyboardEvents;
  recentIgnoredKeyboardEvents = [];

  if (currentState !== "active") {
    return;
  }
  for (let ignoredEvent of ignoredEvents) {
    if (ignoredEvent.time + appStateChangeDelay > time) {
      ignoredEvent.callback(ignoredEvent.event);
    }
  }
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
    if (currentState === "active") {
      callback(event);
    } else {
      recentIgnoredKeyboardEvents.push({ callback, event, time: Date.now() });
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
function removeKeyboardListener(listener: EmitterSubscription) {
  decrementAppStateListeners();
  listener.remove();
}

export {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
};
