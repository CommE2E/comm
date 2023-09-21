// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import type { RawThreadInfo } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

const BATCH_SIZE = 50;
function calculateThreadBatches(threadInfos: {
  +[id: string]: RawThreadInfo,
}): string[][] {
  const threadIDs = Object.keys(threadInfos);
  const batches = [];

  let i = 0;
  while (i < threadIDs.length) {
    batches.push(threadIDs.slice(i, i + BATCH_SIZE));
    i += BATCH_SIZE;
  }

  return batches;
}

function IntegrityHandler(): null {
  const dispatch = useDispatch();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const integrityStore = useSelector(state => state.integrityStore);

  const [batches, setBatches] = React.useState(null);
  const timeout = React.useRef(null);

  React.useEffect(() => {
    if (!integrityStore.threadHashingComplete) {
      clearTimeout(timeout.current);
      setBatches(calculateThreadBatches(threadInfos));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrityStore.threadHashingComplete]);

  React.useEffect(() => {
    if (!batches) {
      return;
    }
    const [batch, ...rest] = batches;
    if (!batch) {
      dispatch({
        type: updateIntegrityStoreActionType,
        payload: { threadHashingComplete: true },
      });
      return;
    }

    dispatch({
      type: updateIntegrityStoreActionType,
      payload: { threadIDsToHash: batch },
    });

    timeout.current = setTimeout(() => setBatches(rest), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  return null;
}

export default IntegrityHandler;
