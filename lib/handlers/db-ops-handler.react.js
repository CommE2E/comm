// @flow

import * as React from 'react';

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type Props = {
  +processDBStoreOperations: StoreOperations => Promise<mixed>,
};

function DBOpsHandler(props: Props): React.Node {
  const { processDBStoreOperations } = props;
  const dispatch = useDispatch();

  const noOpsActions = useSelector(state => state.dbOpsStore.noOpsActions);
  React.useEffect(() => {
    if (noOpsActions.length === 0) {
      return;
    }
    dispatch({
      type: opsProcessingFinishedActionType,
      payload: { actionIDs: noOpsActions },
    });
  }, [noOpsActions, dispatch]);

  const queuedOps = useSelector(state => state.dbOpsStore.queuedOps);
  const opsInProgress = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    for (const item of queuedOps) {
      if (opsInProgress.current.has(item.opsID)) {
        continue;
      }
      opsInProgress.current.add(item.opsID);
      void (async () => {
        await processDBStoreOperations(item.ops);
        dispatch({
          type: opsProcessingFinishedActionType,
          payload: { opsID: item.opsID },
        });
        opsInProgress.current.delete(item.opsID);
      })();
    }
  }, [dispatch, processDBStoreOperations, queuedOps]);

  return null;
}

export { DBOpsHandler };
