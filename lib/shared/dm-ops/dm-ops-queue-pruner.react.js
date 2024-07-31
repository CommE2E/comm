// @flow
import * as React from 'react';

import { pruneDMOpsQueueActionType } from '../../types/dm-ops.js';
import { useDispatch } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const MAX_AGE_PRUNED = 3 * 24 * 60 * 60 * 1000;

function DmOpsQueuePruner(): React.Node {
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

  return null;
}

export { DmOpsQueuePruner };
