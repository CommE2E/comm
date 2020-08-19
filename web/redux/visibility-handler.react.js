// @flow

import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Visibility from 'visibilityjs';

import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

function VisibilityHandler() {
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

  const prevVisibleRef = React.useRef(curForeground);
  React.useEffect(() => {
    const prevVisible = prevVisibleRef.current;
    if (visible && !prevVisible) {
      updateRedux(true);
    } else if (!visible && prevVisible) {
      updateRedux(false);
    }
    prevVisibleRef.current = visible;
  }, [visible, updateRedux]);

  return null;
}

export default VisibilityHandler;
