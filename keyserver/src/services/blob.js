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

type BlobDescriptor = {
  +hash: string,
  +holder: string,
};

type BlobOperationResult =
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
  blob: Blob,
  hash: string,
): Promise<BlobOperationResult> {
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
    uploadBlob(blob, hash),
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

export { upload, uploadBlob, assignHolder, download, deleteBlob };
