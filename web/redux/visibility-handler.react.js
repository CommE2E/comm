// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils';

import { useVisibility } from './visibility';

function VisibilityHandler() {
  const visibility = useVisibility();
  const [visible, setVisible] = React.useState(!visibility.hidden());
  const onVisibilityChange = React.useCallback((event, state: string) => {
    setVisible(state === 'visible');
  }, []);
  React.useEffect(() => {
    const listener = visibility.change(onVisibilityChange);
    return () => {
      visibility.unbind(listener);
    };
  }, [visibility, onVisibilityChange]);

  const dispatch = useDispatch();
  const curForeground = useIsAppForegrounded();
  const updateRedux = React.useCallback(
    (foreground) => {
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
