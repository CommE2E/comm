// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  type SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from './keyboard.js';
import { useSelector } from '../redux/redux-utils.js';
import { derivedDimensionsInfoSelector } from '../selectors/dimensions-selectors.js';
import type { KeyboardEvent } from '../types/react-native.js';

type UseKeyboardHeightParams = {
  +ignoreKeyboardDismissal?: ?boolean,
  +disabled?: ?boolean,
};

function useKeyboardHeight(
  params?: ?UseKeyboardHeightParams,
): SharedValue<number> {
  const ignoreKeyboardDismissal = params?.ignoreKeyboardDismissal;
  const disabled = params?.disabled;

  const keyboardHeightValue = useSharedValue(0);

  const dimensions = useSelector(derivedDimensionsInfoSelector);
  const keyboardShow = React.useCallback(
    (event: KeyboardEvent) => {
      if (
        event.startCoordinates &&
        _isEqual(event.startCoordinates)(event.endCoordinates)
      ) {
        return;
      }
      const keyboardHeight = Platform.select({
        // Android doesn't include the bottomInset in this height measurement
        android: event.endCoordinates.height,
        default: Math.max(
          event.endCoordinates.height - dimensions.bottomInset,
          0,
        ),
      });
      keyboardHeightValue.value = keyboardHeight;
    },
    [dimensions.bottomInset, keyboardHeightValue],
  );
  const keyboardHide = React.useCallback(() => {
    if (!ignoreKeyboardDismissal) {
      keyboardHeightValue.value = 0;
    }
  }, [ignoreKeyboardDismissal, keyboardHeightValue]);

  React.useEffect(() => {
    if (disabled) {
      return undefined;
    }
    const keyboardShowListener = addKeyboardShowListener(keyboardShow);
    const keyboardHideListener = addKeyboardDismissListener(keyboardHide);
    return () => {
      removeKeyboardListener(keyboardShowListener);
      removeKeyboardListener(keyboardHideListener);
    };
  }, [disabled, keyboardShow, keyboardHide]);

  return keyboardHeightValue;
}

function useRatchetingKeyboardHeight(
  params?: UseKeyboardHeightParams,
): SharedValue<number> {
  const keyboardHeightValue = useKeyboardHeight(params);
  const ratchetedKeyboardHeight = useSharedValue(0);
  useAnimatedReaction(
    () => keyboardHeightValue.value,
    (currentValue, previousValue) => {
      if (currentValue > previousValue || currentValue === 0) {
        ratchetedKeyboardHeight.value = currentValue;
      }
    },
  );
  return ratchetedKeyboardHeight;
}

export { useKeyboardHeight, useRatchetingKeyboardHeight };
