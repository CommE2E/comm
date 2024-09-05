// @flow
import * as React from 'react';

import useDMActivityHandler from 'lib/handlers/dm-activity-handler.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';

import { activeMessageListSelector } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';

function DMActivityHandler(): React.Node {
  const active = useSelector(
    state => isLoggedIn(state) && state.lifecycleState !== 'background',
  );
  const navContext = React.useContext(NavContext);
  const activeThread = React.useMemo(() => {
    if (!active) {
      return null;
    }
    return activeMessageListSelector(navContext);
  }, [active, navContext]);

  useDMActivityHandler(activeThread);
  return null;
}

export default DMActivityHandler;
