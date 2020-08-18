// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';
import Visibility from 'visibilityjs';

import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

function FocusHandler() {
  const [visible, setVisible] = React.useState(!Visibility.hidden());
  const onVisibilityChange = React.useCallback((event, state: string) => {
    setVisible(state === 'visible');
  }, []);
  React.useEffect(() => {
    const listener = Visibility.change(onVisibilityChange);
    return () => {
      Visibility.unbind(listener);
    };
  }, [onVisibilityChange]);

  const [focused, setFocused] = React.useState(
    !window || !window.hasFocus || window.hasFocus(),
  );
  const onFocus = React.useCallback(() => {
    setFocused(true);
  }, []);
  const onBlur = React.useCallback(() => {
    setFocused(false);
  }, []);
  React.useEffect(() => {
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [onFocus, onBlur]);

  const foreground = visible && focused;
  const dispatch = useDispatch();
  const prevForegroundRef = React.useRef(true);
  React.useEffect(() => {
    const prevForeground = prevForegroundRef.current;
    if (foreground && !prevForeground) {
      dispatch({ type: foregroundActionType, payload: null });
    } else if (!foreground && prevForeground) {
      dispatch({ type: backgroundActionType, payload: null });
    }
    prevForegroundRef.current = foreground;
  }, [foreground, dispatch]);

  return null;
}

export default FocusHandler;
