// @flow

import * as React from 'react';

import { incrementColdStartCountActionType } from 'lib/actions/alert-actions.js';
import { useIsLoggedInToIdentityAndAuthoritativeKeyserver } from 'lib/hooks/account-hooks.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { useSelector } from '../redux/redux-utils.js';

function ColdStartTracker(): React.Node {
  const dispatch = useDispatch();
  const loggedIn = useIsLoggedInToIdentityAndAuthoritativeKeyserver();
  const isActive = useSelector(state => state.lifecycleState !== 'background');

  const hasTrackedColdStartRef = React.useRef(false);

  React.useEffect(() => {
    if (!loggedIn || !isActive || hasTrackedColdStartRef.current) {
      return;
    }

    hasTrackedColdStartRef.current = true;

    dispatch({
      type: incrementColdStartCountActionType,
    });
  }, [dispatch, loggedIn, isActive]);

  return null;
}

export default ColdStartTracker;
