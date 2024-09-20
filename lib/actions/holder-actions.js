// @flow

import blobService from '../facts/blob-service.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type { BlobHashAndHolder } from '../types/holder-types.js';
import { toBase64URL } from '../utils/base64.js';
import { makeBlobServiceEndpointURL } from '../utils/blob-service.js';
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

// This function can be simplified when batch holders operations
// are implemented on Blob Service
async function performBlobServiceHolderActions(
  action: 'establish' | 'remove',
  inputs: MultipleBlobHolders,
  authMetadata: AuthMetadata,
): Promise<BlobServiceActionsResult> {
  if (inputs.length === 0) {
    return { succeeded: [], failed: [] };
  }

  const endpoint =
    action === 'establish'
      ? blobService.httpEndpoints.ASSIGN_HOLDER
      : blobService.httpEndpoints.DELETE_BLOB;
  const endpointURL = makeBlobServiceEndpointURL(endpoint);
  const defaultHeaders = createDefaultHTTPRequestHeaders(authMetadata);

  const promises = inputs.map(async input => {
    const blobHash = toBase64URL(input.blobHash);
    try {
      const response = await fetch(endpointURL, {
        method: endpoint.method,
        body: JSON.stringify({
          holder: input.holder,
          blob_hash: blobHash,
        }),
        headers: {
          ...defaultHeaders,
          'content-type': 'application/json',
        },
      });
      const holderAlreadyEstablishedResponse =
        action === 'establish' && response.status === 409;
      if (response.ok || holderAlreadyEstablishedResponse) {
        return { ...input, success: true };
      }
      return { ...input, success: false };
    } catch (e) {
      return { ...input, success: false };
    }
  });

  const results = await Promise.all(promises);
  const succeeded = [],
    failed = [];
  for (const { success, ...holderEntry } of results) {
    if (success) {
      succeeded.push(holderEntry);
    } else {
      failed.push(holderEntry);
    }
  }

  return {
    succeeded,
    failed,
  };
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

export { processHoldersAction };
