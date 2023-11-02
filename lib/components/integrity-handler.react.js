// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { splitIntoChunks } from '../utils/array.js';
import { useSelector } from '../utils/redux-utils.js';

const BATCH_SIZE = 50;
// Time between hashing of each thread batch
const BATCH_INTERVAL = 500; // in milliseconds

function IntegrityHandler(): null {
  const dispatch = useDispatch();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const integrityStore = useSelector(state => state.integrityStore);

  const [batches, setBatches] =
    React.useState<?$ReadOnlyArray<$ReadOnlyArray<string>>>(null);
  const timeout = React.useRef<?TimeoutID>(null);

  React.useEffect(() => {
    if (integrityStore.threadHashingStatus === 'starting') {
      const threadIDs = Object.keys(threadInfos);
      setBatches(splitIntoChunks(threadIDs, BATCH_SIZE));
      dispatch({
        type: updateIntegrityStoreActionType,
        payload: { threadHashingStatus: 'running' },
      });
    } else if (integrityStore.threadHashingStatus === 'completed') {
      clearTimeout(timeout.current);
      setBatches(null);
    }
  }, [dispatch, integrityStore.threadHashingStatus, threadInfos]);

  React.useEffect(() => {
    if (!batches) {
      return undefined;
    }
    const [batch, ...rest] = batches;
    if (!batch) {
      dispatch({
        type: updateIntegrityStoreActionType,
        payload: { threadHashingStatus: 'completed' },
      });
      return undefined;
    }

    dispatch({
      type: updateIntegrityStoreActionType,
      payload: { threadIDsToHash: batch },
    });

    const timeoutID = setTimeout(() => setBatches(rest), BATCH_INTERVAL);
    timeout.current = timeoutID;
    return () => clearTimeout(timeoutID);
  }, [batches, dispatch]);

  return null;
}

export default IntegrityHandler;
