// @flow

import blobService from 'lib/facts/blob-service.js';
import type { BlobHashAndHolder } from 'lib/types/holder-types.js';
import {
  makeBlobServiceEndpointURL,
  downloadBlob,
} from 'lib/utils/blob-service.js';
import {
  uploadBlob,
  removeMultipleHolders,
  type BlobOperationResult,
} from 'lib/utils/blob-service.js';
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

type BlobDescriptor = {
  +hash: string,
  +holder: string,
};

async function assignHolder(
  params: BlobDescriptor,
): Promise<BlobOperationResult> {
  const { hash, holder } = params;
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
    return { success: false, reason: 'OTHER', status, statusText };
  }

  return { success: true };
}

async function uploadBlobKeyserverWrapper(
  blob: Blob,
  hash: string,
): Promise<BlobOperationResult> {
  const authHeaders = await createRequestHeaders(false);
  return uploadBlob(blob, hash, authHeaders);
}

async function upload(
  blob: Blob,
  params: BlobDescriptor,
): Promise<
  | {
      +success: true,
    }
  | {
      +success: false,
      +assignHolderResult: BlobOperationResult,
      +uploadBlobResult: BlobOperationResult,
    },
> {
  const { hash, holder } = params;
  const [holderResult, uploadResult] = await Promise.all([
    assignHolder({ hash, holder }),
    uploadBlobKeyserverWrapper(blob, hash),
  ]);
  if (holderResult.success && uploadResult.success) {
    return { success: true };
  }
  return {
    success: false,
    assignHolderResult: holderResult,
    uploadBlobResult: uploadResult,
  };
}

export type BlobDownloadResult =
  | {
      +found: false,
      +status: number,
    }
  | {
      +found: true,
      +blob: Blob,
    };
async function download(hash: string): Promise<BlobDownloadResult> {
  const headers = await createRequestHeaders();
  const blobResult = await downloadBlob(hash, headers);

  if (blobResult.result !== 'success') {
    return { found: false, status: blobResult.status };
  }
  const blob = await blobResult.response.blob();
  return { found: true, blob };
}

async function deleteBlob(params: BlobDescriptor, instant?: boolean) {
  const { hash, holder } = params;
  const endpoint = blobService.httpEndpoints.DELETE_BLOB;
  const url = makeBlobServiceEndpointURL(endpoint);
  const headers = await createRequestHeaders();
  await fetch(url, {
    method: endpoint.method,
    body: JSON.stringify({
      holder,
      blob_hash: hash,
      instant_delete: !!instant,
    }),
    headers,
  });
}

async function removeBlobHolders(holders: $ReadOnlyArray<BlobHashAndHolder>) {
  const headers = await createRequestHeaders(false);
  await removeMultipleHolders(holders, headers);
}

export {
  upload,
  uploadBlob,
  assignHolder,
  download,
  deleteBlob,
  uploadBlobKeyserverWrapper,
  removeBlobHolders,
};
