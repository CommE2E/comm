// @flow

import blobService from 'lib/facts/blob-service.js';
import {
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
} from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';

async function uploadBlob(blob: Blob, hash: string): Promise<void> {
  const formData = new FormData();
  formData.append('blob_hash', hash);
  formData.append('blob_data', blob);

  const uploadBlobResponse = await fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.UPLOAD_BLOB),
    {
      method: blobService.httpEndpoints.UPLOAD_BLOB.method,
      body: formData,
    },
  );

  if (!uploadBlobResponse.ok) {
    const { status, statusText } = uploadBlobResponse;
    throw new Error(`Payload upload failed with HTTP ${status}: ${statusText}`);
  }
}

async function assignHolder(holder: string, hash: string): Promise<void> {
  const assignHolderResponse = await fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.ASSIGN_HOLDER),
    {
      method: blobService.httpEndpoints.ASSIGN_HOLDER.method,
      body: JSON.stringify({
        holder,
        blob_hash: hash,
      }),
      headers: {
        'content-type': 'application/json',
      },
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

async function download(hash: string): Promise<Blob> {
  const url = getBlobFetchableURL(hash);
  const response = await fetch(url, {
    method: blobService.httpEndpoints.GET_BLOB.method,
    headers: {
      'content-type': 'application/json',
    },
  });
  return response.blob();
}

export { upload, uploadBlob, assignHolder, download };
