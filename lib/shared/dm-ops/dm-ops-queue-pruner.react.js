// @flow
import * as React from 'react';

import { pruneDMOpsQueueActionType } from '../../types/dm-ops.js';
import { useDispatch } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 6 * 60 * 60 * 1000;
const MAX_AGE_PRUNED = 3 * 24 * 60 * 60 * 1000;

function DmOpsQueuePruner(): React.Node {
  const dispatch = useDispatch();
  React.useEffect(() => {
    const intervalID = setInterval(() => {
      const now = Date.now();
      dispatch({
        type: pruneDMOpsQueueActionType,
        payload: {
          pruneMaxTime: now - MAX_AGE_PRUNED,
        },
      });
    }, PRUNING_FREQUENCY);

    return () => clearInterval(intervalID);
  }, [dispatch]);

  return null;
}

export { DmOpsQueuePruner };
