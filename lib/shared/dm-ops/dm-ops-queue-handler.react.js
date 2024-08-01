// @flow

import * as React from 'react';

import { useProcessDMOperation } from './process-dm-ops.js';
import { threadInfoSelector } from '../../selectors/thread-selectors.js';
import {
  clearQueuedThreadDMOpsActionType,
  pruneDMOpsQueueActionType,
} from '../../types/dm-ops.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const QUEUED_OPERATION_TTL = 3 * 24 * 60 * 60 * 1000;

function DMOpsQueueHandler(): React.Node {
  const dispatch = useDispatch();

  const prune = React.useCallback(() => {
    const now = Date.now();
    dispatch({
      type: pruneDMOpsQueueActionType,
      payload: {
        pruneMaxTimestamp: now - QUEUED_OPERATION_TTL,
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

  const processDMOperation = useProcessDMOperation();

  React.useEffect(() => {
    const prevThreadIDs = prevThreadIDsRef.current;
    prevThreadIDsRef.current = threadIDs;

    for (const threadID in queuedOperations) {
      if (!threadIDs.has(threadID) || prevThreadIDs.has(threadID)) {
        continue;
      }
      for (const dmOp of queuedOperations[threadID]) {
        void processDMOperation(dmOp.operation);
      }

      dispatch({
        type: clearQueuedThreadDMOpsActionType,
        payload: {
          threadID,
        },
      });
    }
  }, [dispatch, processDMOperation, queuedOperations, threadIDs]);

  return null;
}

export { DMOpsQueueHandler };
