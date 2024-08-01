// @flow

import * as React from 'react';

import { useProcessDMOperation } from './process-dm-ops.js';
import { threadInfoSelector } from '../../selectors/thread-selectors.js';
import {
  clearDMOpsThreadQueueActionType,
  pruneDMOpsQueueActionType,
} from '../../types/dm-ops.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const MAX_AGE_PRUNED = 3 * 24 * 60 * 60 * 1000;

function DmOpsQueueHandler(): React.Node {
  const dispatch = useDispatch();

  const prune = React.useCallback(() => {
    const now = Date.now();
    dispatch({
      type: pruneDMOpsQueueActionType,
      payload: {
        pruneMaxTime: now - MAX_AGE_PRUNED,
      },
    });
  }, [dispatch]);

  React.useEffect(() => {
    const timeoutID = setTimeout(prune, FIRST_PRUNING_DELAY);
    const intervalID = setInterval(prune, PRUNING_FREQUENCY);

    return () => {
      clearTimeout(timeoutID);
      clearInterval(intervalID);
    };
  }, [prune]);

  const threadInfos = useSelector(threadInfoSelector);
  const threadIDs = React.useMemo(
    () => new Set(Object.keys(threadInfos)),
    [threadInfos],
  );
  const prevThreadIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedOperations = useSelector(
    state => state.queuedDMOperations.operations,
  );
  const queuedOperationsThreadIDs = React.useMemo(
    () => Object.keys(queuedOperations),
    [queuedOperations],
  );

  const processDMOperation = useProcessDMOperation();

  React.useEffect(() => {
    void (async () => {
      const prevThreadIDs = prevThreadIDsRef.current;
      prevThreadIDsRef.current = threadIDs;

      for (const threadID of queuedOperationsThreadIDs) {
        if (!threadIDs.has(threadID) || prevThreadIDs.has(threadID)) {
          continue;
        }
        for (const dmOp of queuedOperations[threadID]) {
          await processDMOperation(dmOp.operation);
        }

        dispatch({
          type: clearDMOpsThreadQueueActionType,
          payload: {
            threadID,
          },
        });
      }
    })();
  }, [
    dispatch,
    processDMOperation,
    queuedOperations,
    queuedOperationsThreadIDs,
    threadIDs,
  ]);

  return null;
}

export { DmOpsQueueHandler };
