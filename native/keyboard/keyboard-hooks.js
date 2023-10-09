// @flow

import * as React from 'react';

import {
  addKeyboardShowListener,
  addKeyboardDismissListener,
  removeKeyboardListener,
} from './keyboard.js';
import type { KeyboardEvent } from '../types/react-native.js';

function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = React.useState<number>(0);

  const onKeyboardShow = React.useCallback((event: KeyboardEvent) => {
    console.log(`onKeyboardShow: ${JSON.stringify(event)}`);
    const height = event?.endCoordinates?.height ?? 0;
    setKeyboardHeight(height);
  }, []);
  React.useEffect(() => {
    const keyboardShowListener = addKeyboardShowListener(onKeyboardShow);
    return () => {
      removeKeyboardListener(keyboardShowListener);
    };
  }, [onKeyboardShow]);

  const onKeyboardDismiss = React.useCallback((event: ?KeyboardEvent) => {
    console.log(`onKeyboardDismiss: ${JSON.stringify(event)}`);
    setKeyboardHeight(0);
  }, []);

  React.useEffect(() => {
    const keyboardDismissListener =
      addKeyboardDismissListener(onKeyboardDismiss);
    return () => {
      removeKeyboardListener(keyboardDismissListener);
    };
  }, [onKeyboardDismiss]);

  return keyboardHeight;
}

export { useKeyboardHeight };
