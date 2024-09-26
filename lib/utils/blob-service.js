// @flow

import invariant from 'invariant';
import uuid from 'uuid';

import { toBase64URL } from './base64.js';
import { replacePathParams, type URLPathParams } from './url-utils.js';
import type { BlobServiceHTTPEndpoint } from '../facts/blob-service.js';
import blobServiceConfig from '../facts/blob-service.js';

const BLOB_SERVICE_URI_PREFIX = 'comm-blob-service://';

function makeBlobServiceURI(blobHash: string): string {
  return `${BLOB_SERVICE_URI_PREFIX}${blobHash}`;
}

function isBlobServiceURI(uri: string): boolean {
  return uri.startsWith(BLOB_SERVICE_URI_PREFIX);
}

/**
 * Returns the base64url-encoded blob hash from a blob service URI.
 * Throws an error if the URI is not a blob service URI.
 */
function blobHashFromBlobServiceURI(uri: string): string {
  invariant(isBlobServiceURI(uri), 'Not a blob service URI');
  return uri.slice(BLOB_SERVICE_URI_PREFIX.length);
}

/**
 * Returns the base64url-encoded blob hash from a blob service URI.
 * Returns null if the URI is not a blob service URI.
 */
function blobHashFromURI(uri: string): ?string {
  if (!isBlobServiceURI(uri)) {
    return null;
  }
  return blobHashFromBlobServiceURI(uri);
}

function makeBlobServiceEndpointURL(
  endpoint: BlobServiceHTTPEndpoint,
  params: URLPathParams = {},
): string {
  const path = replacePathParams(endpoint.path, params);
  return `${blobServiceConfig.url}${path}`;
}

function getBlobFetchableURL(blobHash: string): string {
  return makeBlobServiceEndpointURL(blobServiceConfig.httpEndpoints.GET_BLOB, {
    blobHash,
  });
}

/**
 * Generates random blob holder prefixed by current device ID if present
 */
function generateBlobHolder(deviceID?: ?string): string {
  const randomID = uuid.v4();
  if (!deviceID) {
    return randomID;
  }
  const urlSafeDeviceID = toBase64URL(deviceID);
  return `${urlSafeDeviceID}:${uuid.v4()}`;
}

export type BlobOperationResult =
  | {
      +success: true,
    }
  | {
      +success: false,
      +reason: 'HASH_IN_USE' | 'OTHER',
      +status: number,
      +statusText: string,
    };

async function uploadBlob(
  blob: Blob | string,
  hash: string,
  headers: { [string]: string },
): Promise<BlobOperationResult> {
  const formData = new FormData();
  formData.append('blob_hash', hash);
  if (typeof blob === 'string') {
    formData.append('base64_data', blob);
  } else {
    formData.append('blob_data', blob);
  }

  const uploadBlobResponse = await fetch(
    makeBlobServiceEndpointURL(blobServiceConfig.httpEndpoints.UPLOAD_BLOB),
    {
      method: blobServiceConfig.httpEndpoints.UPLOAD_BLOB.method,
      body: formData,
      headers,
    },
  );

  if (!uploadBlobResponse.ok) {
    const { status, statusText } = uploadBlobResponse;
    const reason = status === 409 ? 'HASH_IN_USE' : 'OTHER';
    return {
      success: false,
      reason,
      status,
      statusText,
    };
  }

  return { success: true };
}

async function assignMultipleHolders(
  holders: $ReadOnlyArray<{ +blobHash: string, +holder: string }>,
  headers: { [string]: string },
): Promise<
  | { +success: true }
  | { +error: true, status: number, statusText: string }
  | {
      +failedAssignments: $ReadOnlyArray<{
        +blobHash: string,
        +holder: string,
      }>,
    },
> {
  const assignMultipleHoldersResponse = await fetch(
    makeBlobServiceEndpointURL(
      blobServiceConfig.httpEndpoints.ASSIGN_MULTIPLE_HOLDERS,
    ),
    {
      method: blobServiceConfig.httpEndpoints.ASSIGN_MULTIPLE_HOLDERS.method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: holders,
      }),
    },
  );

  if (!assignMultipleHoldersResponse.ok) {
    const { status, statusText } = assignMultipleHoldersResponse;
    return { error: true, status, statusText };
  }

  const { results } = await assignMultipleHoldersResponse.json();
  const failedRequests = results
    .filter(result => !result.success)
    .map(({ blobHash, holder }) => ({ blobHash, holder }));

  if (failedRequests.length !== 0) {
    return { failedAssignments: failedRequests };
  }

  return { success: true };
}

export {
  makeBlobServiceURI,
  isBlobServiceURI,
  blobHashFromURI,
  blobHashFromBlobServiceURI,
  generateBlobHolder,
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
  uploadBlob,
  assignMultipleHolders,
};
