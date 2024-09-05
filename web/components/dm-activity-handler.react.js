// @flow
import * as React from 'react';

import useDMActivityHandler from 'lib/handlers/dm-activity-handler.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { useSelector } from '../redux/redux-utils.js';
import { activeThreadSelector } from '../selectors/nav-selectors.js';

function DMActivityHandler(): React.Node {
  const active = useSelector(
    state => isLoggedIn(state) && state.lifecycleState !== 'background',
  );
  const reduxActiveThread = useSelector(activeThreadSelector);
  const windowActive = useSelector(state => state.windowActive);
  const activeThread = React.useMemo(() => {
    if (!active || !windowActive) {
      return null;
    }
    return reduxActiveThread;
  }, [active, windowActive, reduxActiveThread]);

  useDMActivityHandler(activeThread);
  return null;
}

export default DMActivityHandler;
