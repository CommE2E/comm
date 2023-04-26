// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateWindowActiveActionType } from './action-types.js';
import { useSelector } from './redux-utils.js';

function FocusHandler(): React.Node {
  const [focused, setFocused] = React.useState(
    typeof window === 'undefined' ||
      !window ||
      !window.hasFocus ||
      window.hasFocus(),
  );
  const onFocus = React.useCallback(() => {
    setFocused(true);
  }, []);
  const onBlur = React.useCallback(() => {
    setFocused(false);
  }, []);
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [onFocus, onBlur]);

  const dispatch = useDispatch();
  const curWindowActive = useSelector(state => state.windowActive);
  const updateRedux = React.useCallback(
    windowActive => {
      if (windowActive === curWindowActive) {
        return;
      }
      dispatch({ type: updateWindowActiveActionType, payload: windowActive });
    },
    [dispatch, curWindowActive],
  );

  const prevFocusedRef = React.useRef(curWindowActive);
  const timerRef = React.useRef();
  React.useEffect(() => {
    const prevFocused = prevFocusedRef.current;
    if (focused && !prevFocused) {
      timerRef.current = setTimeout(() => updateRedux(true), 2000);
    } else if (!focused && prevFocused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      updateRedux(false);
    }
    prevFocusedRef.current = focused;
  }, [focused, updateRedux]);

  return null;
}

export default FocusHandler;
