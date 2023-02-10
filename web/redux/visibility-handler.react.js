// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateLifecycleStateActionType } from 'lib/reducers/lifecycle-state-reducer.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

import { useVisibility } from './visibility.js';

function VisibilityHandler(): React.Node {
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
    foreground => {
      if (foreground === curForeground) {
        return;
      }
      if (foreground) {
        dispatch({ type: updateLifecycleStateActionType, payload: 'active' });
      } else {
        dispatch({
          type: updateLifecycleStateActionType,
          payload: 'background',
        });
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
