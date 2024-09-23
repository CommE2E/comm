// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import {
  processHoldersAction,
  processHoldersActionTypes,
} from '../actions/holder-actions.js';
import type { ProcessHoldersStartedPayload } from '../actions/holder-actions.js';
import { isLoggedIn } from '../selectors/user-selectors.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const retryInterval = 5000; // ms

function HoldersHandler(): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();
  const identityContext = React.useContext(IdentityClientContext);
  const getAuthMetadata = identityContext?.getAuthMetadata;

  const loggedIn = useSelector(isLoggedIn);
  const storedHolders = useSelector(state => state.holderStore.storedHolders);

  const itemsToProcess = React.useMemo(() => {
    const holdersToAdd = [],
      holdersToRemove = [];

    for (const blobHash in storedHolders) {
      const { status, holder } = storedHolders[blobHash];
      if (status === 'NOT_ESTABLISHED') {
        holdersToAdd.push({ blobHash, holder });
      } else if (status === 'NOT_REMOVED') {
        holdersToRemove.push({ blobHash, holder });
      }
    }
    return { holdersToAdd, holdersToRemove };
  }, [storedHolders]);

  const performHoldersProcessing: (
    input: ProcessHoldersStartedPayload,
  ) => Promise<void> = React.useMemo(
    () =>
      _debounce(async (input: ProcessHoldersStartedPayload) => {
        invariant(getAuthMetadata, 'Identity context not set');
        const authMetadata = await getAuthMetadata();

        void dispatchActionPromise(
          processHoldersActionTypes,
          processHoldersAction(input, authMetadata),
          undefined,
          input,
        );
      }, retryInterval),
    [getAuthMetadata, dispatchActionPromise],
  );

  const shouldStartProcessing =
    itemsToProcess.holdersToAdd.length !== 0 ||
    itemsToProcess.holdersToRemove.length !== 0;

  React.useEffect(() => {
    if (!loggedIn || !shouldStartProcessing) {
      return;
    }

    void performHoldersProcessing(itemsToProcess);
  }, [
    itemsToProcess,
    loggedIn,
    performHoldersProcessing,
    shouldStartProcessing,
  ]);
}

export { HoldersHandler };
