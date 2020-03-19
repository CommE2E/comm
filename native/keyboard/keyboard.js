// @flow

import { AppState, Keyboard, Platform, DeviceInfo } from 'react-native';

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

type ShowKeyboardCallback = (event: KeyboardEvent) => void;
type HideKeyboardCallback = (event: ?KeyboardEvent) => void;
type IgnoredKeyboardEvent =
  | {|
      type: 'show',
      callback: ShowKeyboardCallback,
      event: KeyboardEvent,
      time: number,
    |}
  | {|
      type: 'hide',
      callback: HideKeyboardCallback,
      event: ?KeyboardEvent,
      time: number,
    |};

export type EmitterSubscription = {
  +remove: () => void,
};

// If the app becomes active within 500ms after a keyboard event is triggered,
// we will call the relevant keyboard callbacks.
const appStateChangeDelay = 500;

const isIPhoneX = Platform.OS === 'ios' && DeviceInfo.isIPhoneX_deprecated;
const defaultKeyboardHeight = Platform.select({
  ios: isIPhoneX ? 335 : 216,
  android: 282.28,
});
let keyboardHeight = null;
function getKeyboardHeight(): ?number {
  if (keyboardHeight !== null && keyboardHeight !== undefined) {
    return keyboardHeight;
  }
  return defaultKeyboardHeight;
}

let currentState = AppState.currentState;
let recentIgnoredKeyboardEvents: IgnoredKeyboardEvent[] = [];
function handleAppStateChange(nextAppState: ?string) {
  currentState = nextAppState;

  const time = Date.now();
  const ignoredEvents = recentIgnoredKeyboardEvents;
  recentIgnoredKeyboardEvents = [];

  if (currentState !== 'active') {
    return;
  }
  for (let ignoredEvent of ignoredEvents) {
    if (ignoredEvent.time + appStateChangeDelay <= time) {
      continue;
    }
    // Conditional necessary for Flow :(
    if (ignoredEvent.type === 'show') {
      ignoredEvent.callback(ignoredEvent.event);
    } else {
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

function callShowCallbackIfAppActive(
  callback: ShowKeyboardCallback,
): ShowKeyboardCallback {
  return (event: KeyboardEvent) => {
    if (event) {
      const { height } = event.endCoordinates;
      // On iOS simulator, when the keyboard is disabled we still trigger here,
      // but with small values. This condition should filter that out
      if (Platform.OS !== 'ios' || height > 100) {
        keyboardHeight = height;
      }
    }
    if (currentState === 'active') {
      callback(event);
    } else {
      recentIgnoredKeyboardEvents.push({
        type: 'show',
        callback,
        event,
        time: Date.now(),
      });
    }
  };
}
function addKeyboardShowListener(callback: ShowKeyboardCallback) {
  incrementAppStateListeners();
  return Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    callShowCallbackIfAppActive(callback),
  );
}

function callHideCallbackIfAppActive(
  callback: HideKeyboardCallback,
): HideKeyboardCallback {
  return (event: ?KeyboardEvent) => {
    if (event) {
      const { height } = event.endCoordinates;
      if (height > 0 && (!keyboardHeight || keyboardHeight < height)) {
        keyboardHeight = height;
      }
    }
    if (currentState === 'active') {
      callback(event);
    } else {
      recentIgnoredKeyboardEvents.push({
        type: 'hide',
        callback,
        event,
        time: Date.now(),
      });
    }
  };
}
function addKeyboardDismissListener(callback: HideKeyboardCallback) {
  incrementAppStateListeners();
  return Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    callHideCallbackIfAppActive(callback),
  );
}
function addKeyboardDidDismissListener(callback: HideKeyboardCallback) {
  incrementAppStateListeners();
  return Keyboard.addListener(
    'keyboardDidHide',
    callHideCallbackIfAppActive(callback),
  );
}

function removeKeyboardListener(listener: EmitterSubscription) {
  decrementAppStateListeners();
  listener.remove();
}

export {
  getKeyboardHeight,
  addKeyboardShowListener,
  addKeyboardDismissListener,
  addKeyboardDidDismissListener,
  removeKeyboardListener,
};
