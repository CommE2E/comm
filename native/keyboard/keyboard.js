// @flow

import { Keyboard, Platform, DeviceInfo } from 'react-native';

import type {
  EventSubscription,
  KeyboardEvent,
} from '../types/react-native.js';

export type ScreenRect = $ReadOnly<{
  screenX: number,
  screenY: number,
  width: number,
  height: number,
}>;

type ShowKeyboardCallback = (event: KeyboardEvent) => void;
type HideKeyboardCallback = (event: ?KeyboardEvent) => void;

const isIPhoneX =
  Platform.OS === 'ios' && DeviceInfo.getConstants().isIPhoneX_deprecated;
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

function callShowCallback(
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
    callback(event);
  };
}
function addKeyboardShowListener(
  callback: ShowKeyboardCallback,
): EventSubscription {
  return Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    callShowCallback(callback),
  );
}

function callHideCallback(
  callback: HideKeyboardCallback,
): HideKeyboardCallback {
  return (event: ?KeyboardEvent) => {
    if (event) {
      const { height } = event.endCoordinates;
      if (height > 0 && (!keyboardHeight || keyboardHeight < height)) {
        keyboardHeight = height;
      }
    }
    callback(event);
  };
}
function addKeyboardDismissListener(
  callback: HideKeyboardCallback,
): EventSubscription {
  return Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    callHideCallback(callback),
  );
}
function addKeyboardDidDismissListener(
  callback: HideKeyboardCallback,
): EventSubscription {
  return Keyboard.addListener('keyboardDidHide', callHideCallback(callback));
}

function removeKeyboardListener(listener: EventSubscription) {
  listener.remove();
}

// This happens because we set windowTranslucentStatus and
// windowTranslucentNavigation
const rnsacThinksAndroidKeyboardResizesFrame: boolean =
  Platform.OS === 'android' && Platform.Version < 23;

export {
  getKeyboardHeight,
  addKeyboardShowListener,
  addKeyboardDismissListener,
  addKeyboardDidDismissListener,
  removeKeyboardListener,
  rnsacThinksAndroidKeyboardResizesFrame,
};
