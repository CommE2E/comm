// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function DBOpsHandler(): React.Node {
  const queueFront = useSelector(state => state.dbOpsStore.queuedOps[0]);

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (!queueFront) {
      return;
    }
    if (!queueFront.ops) {
      dispatch({
        type: opsProcessingFinishedActionType,
      });
    }
  }, [queueFront, dispatch]);

  return null;
}

export { DBOpsHandler };
