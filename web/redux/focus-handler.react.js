// @flow

import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

  const dispatch = useDispatch();
  const curForeground = useSelector(state => state.foreground);
  const updateRedux = React.useCallback(
    foreground => {
      if (foreground === curForeground) {
        return;
      }
      if (foreground) {
        dispatch({ type: foregroundActionType, payload: null });
      } else {
        dispatch({ type: backgroundActionType, payload: null });
      }
    },
    [dispatch, curForeground],
  );

  const foreground = visible && focused;
  const prevForegroundRef = React.useRef(curForeground);
  const foregroundTimerRef = React.useRef();
  React.useEffect(() => {
    const prevForeground = prevForegroundRef.current;
    if (foreground && !prevForeground) {
      foregroundTimerRef.current = setTimeout(() => updateRedux(true), 2000);
    } else if (!foreground && prevForeground) {
      if (foregroundTimerRef.current) {
        clearTimeout(foregroundTimerRef.current);
        foregroundTimerRef.current = undefined;
      }
      updateRedux(false);
    }
    prevForegroundRef.current = foreground;
  }, [foreground, updateRedux]);

  return null;
}

export default FocusHandler;
