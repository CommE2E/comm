// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  type AuthMetadata,
  IdentityClientContext,
} from '../shared/identity-client-context.js';
import type {
  BlobHashAndHolder,
  BlobOperation,
} from '../types/holder-types.js';
import { toBase64URL } from '../utils/base64.js';
import {
  generateBlobHolder,
  assignMultipleHolders,
  removeMultipleHolders,
} from '../utils/blob-service.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';
import { createDefaultHTTPRequestHeaders } from '../utils/services-utils.js';

type MultipleBlobHolders = $ReadOnlyArray<BlobHashAndHolder>;

export const storeEstablishedHolderActionType = 'STORE_ESTABLISHED_HOLDER';

export const processHoldersActionTypes = Object.freeze({
  started: 'PROCESS_HOLDERS_STARTED',
  success: 'PROCESS_HOLDERS_SUCCESS',
  failed: 'PROCESS_HOLDERS_FAILED',
});
export type ProcessHoldersStartedPayload = {
  +holdersToAdd: MultipleBlobHolders,
  +holdersToRemove: MultipleBlobHolders,
};
export type ProcessHoldersFailedPayload = {
  +notAdded: MultipleBlobHolders,
  +notRemoved: MultipleBlobHolders,
};
export type ProcessHoldersFinishedPayload = {
  +added: MultipleBlobHolders,
  +removed: MultipleBlobHolders,
  +notAdded: MultipleBlobHolders,
  +notRemoved: MultipleBlobHolders,
};

type BlobServiceActionsResult = {
  +succeeded: MultipleBlobHolders,
  +failed: MultipleBlobHolders,
};

async function performBlobServiceHolderActions(
  action: 'establish' | 'remove',
  inputs: MultipleBlobHolders,
  authMetadata: AuthMetadata,
): Promise<BlobServiceActionsResult> {
  if (inputs.length === 0) {
    return { succeeded: [], failed: [] };
  }

  const defaultHeaders = createDefaultHTTPRequestHeaders(authMetadata);
  const blobServiceCall =
    action === 'establish' ? assignMultipleHolders : removeMultipleHolders;

  const requestInputs = inputs.map(({ blobHash, ...rest }) => ({
    ...rest,
    blobHash: toBase64URL(blobHash),
  }));
  const response = await blobServiceCall(requestInputs, defaultHeaders);
  if (response.result === 'success') {
    return { succeeded: inputs, failed: [] };
  }
  if (response.result === 'error') {
    return { succeeded: [], failed: inputs };
  }

  // TODO: find a way to do better than O(n^2)
  const failed = [],
    succeeded = [];
  const failedRequests = [...response.failedRequests];
  for (const item of inputs) {
    const formattedBlobHash = toBase64URL(item.blobHash);
    const failedItemIdx = failedRequests.findIndex(
      failedItem =>
        failedItem.blobHash === formattedBlobHash &&
        failedItem.holder === item.holder,
    );

    if (failedItemIdx >= 0) {
      failedRequests.splice(failedItemIdx, 1);
      failed.push(item);
    } else {
      succeeded.push(item);
    }
  }

  return { succeeded, failed };
}

async function processHoldersAction(
  input: ProcessHoldersStartedPayload,
  authMetadata: AuthMetadata,
): Promise<ProcessHoldersFinishedPayload> {
  const [
    { succeeded: added, failed: notAdded },
    { succeeded: removed, failed: notRemoved },
  ] = await Promise.all([
    performBlobServiceHolderActions(
      'establish',
      input.holdersToAdd,
      authMetadata,
    ),
    performBlobServiceHolderActions(
      'remove',
      input.holdersToRemove,
      authMetadata,
    ),
  ]);
  return { added, notAdded, removed, notRemoved };
}

function useClearAllHolders(): () => Promise<void> {
  const dispatchActionPromise = useDispatchActionPromise();
  const identityContext = React.useContext(IdentityClientContext);
  const getAuthMetadata = identityContext?.getAuthMetadata;

  const storedHolders = useSelector(state => state.holderStore.storedHolders);
  const holdersToRemove = React.useMemo(
    () =>
      Object.entries(storedHolders)
        .filter(([, holderInfo]) => holderInfo.status !== 'PENDING_REMOVAL')
        .map(([blobHash, { holder }]) => ({ blobHash, holder })),
    [storedHolders],
  );

  return React.useCallback(async () => {
    invariant(getAuthMetadata, 'Identity context not set');
    const authMetadata = await getAuthMetadata();
    const input = {
      holdersToRemove,
      holdersToAdd: [],
    };
    const promise = processHoldersAction(input, authMetadata);
    void dispatchActionPromise(
      processHoldersActionTypes,
      promise,
      undefined,
      input,
    );
  }, [dispatchActionPromise, getAuthMetadata, holdersToRemove]);
}

export type ProcessHolders = (
  blobOperations: $ReadOnlyArray<BlobOperation>,
) => Promise<void>;
function useProcessBlobHolders(): ProcessHolders {
  const identityContext = React.useContext(IdentityClientContext);
  const getAuthMetadata = identityContext?.getAuthMetadata;

  const storedHolders = useSelector(state => state.holderStore.storedHolders);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async (ops: $ReadOnlyArray<BlobOperation>) => {
      if (ops.length === 0) {
        return;
      }

      invariant(getAuthMetadata, 'Identity context not set');
      const authMetadata = await getAuthMetadata();

      const holdersToAdd = ops
        .map(({ blobHash, type }) => {
          const status = storedHolders[blobHash]?.status;
          if (
            type !== 'establish_holder' ||
            status === 'ESTABLISHED' ||
            status === 'PENDING_ESTABLISHMENT'
          ) {
            return null;
          }
          return {
            blobHash,
            holder: generateBlobHolder(authMetadata.deviceID),
          };
        })
        .filter(Boolean);

      const holdersToRemove = ops
        .map(({ blobHash, type }) => {
          const holderInfo = storedHolders[blobHash];
          if (
            !holderInfo ||
            type !== 'remove_holder' ||
            holderInfo.status === 'PENDING_REMOVAL'
          ) {
            return null;
          }
          return { blobHash, holder: holderInfo.holder };
        })
        .filter(Boolean);

      const input = {
        holdersToAdd,
        holdersToRemove,
      };
      const promise = processHoldersAction(input, authMetadata);
      void dispatchActionPromise(
        processHoldersActionTypes,
        promise,
        undefined,
        input,
      );
    },
    [dispatchActionPromise, getAuthMetadata, storedHolders],
  );
}

export { processHoldersAction, useClearAllHolders, useProcessBlobHolders };
