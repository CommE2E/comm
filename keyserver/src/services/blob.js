// @flow

import blobService from 'lib/facts/blob-service.js';
import { makeBlobServiceEndpointURL } from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';

async function upload(blob: Blob, hash: string, holder: string): Promise<void> {
  const formData = new FormData();
  formData.append('blob_hash', hash);
  formData.append('blob_data', blob);

  const assignHolderPromise = fetch(
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

  const uploadHolderPromise = fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.UPLOAD_BLOB),
    {
      method: blobService.httpEndpoints.UPLOAD_BLOB.method,
      body: formData,
    },
  );

  let assignHolderResponse, uploadBlobResponse;
  try {
    [assignHolderResponse, uploadBlobResponse] = await Promise.all([
      assignHolderPromise,
      uploadHolderPromise,
    ]);
  } catch (e) {
    throw new Error(
      `Payload upload failed with: ${
        getMessageForException(e) ?? 'unknown error'
      }`,
    );
  }

  if (!assignHolderResponse.ok) {
    const { status, statusText } = assignHolderResponse;
    throw new Error(
      `Holder assignment failed with HTTP ${status}: ${statusText}`,
    );
  }

  if (!uploadBlobResponse.ok) {
    const { status, statusText } = uploadBlobResponse;
    throw new Error(`Payload upload failed with HTTP ${status}: ${statusText}`);
  }
}

export { upload };
