// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

function DBOpsHandler(): React.Node {
  const noOpsActions = useSelector(state => state.dbOpsStore.noOpsActions);

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (noOpsActions.length === 0) {
      return;
    }
    dispatch({
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: noOpsActions },
    });
  }, [noOpsActions, dispatch]);

  return null;
}

export { DBOpsHandler };
