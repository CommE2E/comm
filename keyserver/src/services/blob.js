// @flow

import blobService from 'lib/facts/blob-service.js';
import {
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
} from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { createHTTPAuthorizationHeader } from 'lib/utils/services-utils.js';

import { verifyUserLoggedIn } from '../user/login.js';
import { getContentSigningKey } from '../utils/olm-utils.js';

async function createRequestHeaders(
  includeContentType: boolean = true,
): Promise<{ [string]: string }> {
  const [{ userId: userID, accessToken }, deviceID] = await Promise.all([
    verifyUserLoggedIn(),
    getContentSigningKey(),
  ]);

  const authorization = createHTTPAuthorizationHeader({
    userID,
    deviceID,
    accessToken,
  });

  return {
    Authorization: authorization,
    ...(includeContentType && { 'Content-Type': 'application/json' }),
  };
}

async function uploadBlob(blob: Blob, hash: string): Promise<void> {
  const formData = new FormData();
  formData.append('blob_hash', hash);
  formData.append('blob_data', blob);

  const headers = await createRequestHeaders(false);
  const uploadBlobResponse = await fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.UPLOAD_BLOB),
    {
      method: blobService.httpEndpoints.UPLOAD_BLOB.method,
      body: formData,
      headers,
    },
  );

  if (!uploadBlobResponse.ok) {
    const { status, statusText } = uploadBlobResponse;
    throw new Error(`Payload upload failed with HTTP ${status}: ${statusText}`);
  }
}

async function assignHolder(holder: string, hash: string): Promise<void> {
  const headers = await createRequestHeaders();
  const assignHolderResponse = await fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.ASSIGN_HOLDER),
    {
      method: blobService.httpEndpoints.ASSIGN_HOLDER.method,
      body: JSON.stringify({
        holder,
        blob_hash: hash,
      }),
      headers,
    },
  );

  if (!assignHolderResponse.ok) {
    const { status, statusText } = assignHolderResponse;
    throw new Error(
      `Holder assignment failed with HTTP ${status}: ${statusText}`,
    );
  }
}

async function upload(blob: Blob, hash: string, holder: string): Promise<void> {
  try {
    await Promise.all([assignHolder(holder, hash), uploadBlob(blob, hash)]);
  } catch (e) {
    throw new Error(
      `Payload upload failed with: ${
        getMessageForException(e) ?? 'unknown error'
      }`,
    );
  }
}

export type BlobDownloadResult =
  | {
      +found: false,
    }
  | {
      +found: true,
      +blob: Blob,
    };
async function download(hash: string): Promise<BlobDownloadResult> {
  const url = getBlobFetchableURL(hash);
  const headers = await createRequestHeaders();
  const response = await fetch(url, {
    method: blobService.httpEndpoints.GET_BLOB.method,
    headers,
  });

  if (!response.ok) {
    return { found: false };
  }
  const blob = await response.blob();
  return { found: true, blob };
}

export { upload, uploadBlob, assignHolder, download };
