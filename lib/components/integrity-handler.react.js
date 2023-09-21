// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateIntegrityStoreActionType } from '../actions/integrity-actions.js';
import { splitIntoChunks } from '../utils/array.js';
import { useSelector } from '../utils/redux-utils.js';

const BATCH_SIZE = 50;
// Time between hashing of each thread batch
const BATCH_INTERVAL = 10000; // in milliseconds

function IntegrityHandler(): null {
  const dispatch = useDispatch();

  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const integrityStore = useSelector(state => state.integrityStore);

  const [batches, setBatches] = React.useState(null);
  const timeout = React.useRef(null);

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
    // We only want this effect to trigger on changes of `threadHashingStatus`
    // because that means we might need to restart the hashing process.
    // We don't want to start the hashing process on each change of the
    // `threadInfos` because this is handled by thread operations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrityStore.threadHashingStatus]);

  React.useEffect(() => {
    if (!batches) {
      return;
    }
    const [batch, ...rest] = batches;
    if (!batch) {
      dispatch({
        type: updateIntegrityStoreActionType,
        payload: { threadHashingStatus: 'completed' },
      });
      return;
    }

    dispatch({
      type: updateIntegrityStoreActionType,
      payload: { threadIDsToHash: batch },
    });

    timeout.current = setTimeout(() => setBatches(rest), BATCH_INTERVAL);
    // This should be triggered only by the timeout started in this effect
    // or whenever the previous effect starts a new hashing proccess
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  return null;
}

export default IntegrityHandler;
