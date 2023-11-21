// @flow

import crypto from 'crypto';
import uuid from 'uuid';

import blobService from 'lib/facts/blob-service.js';
import { toBase64URL } from 'lib/utils/base64.js';
import { makeBlobServiceEndpointURL } from 'lib/utils/blob-service.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { encrypt, generateKey } from '../utils/aes-crypto-utils.js';

async function upload(payload: string): Promise<
  | {
      +blobHash: string,
      +encryptionKey: string,
    }
  | { +blobUploadError: string },
> {
  const encryptionKey = await generateKey();
  const encryptedPayloadBuffer = Buffer.from(
    await encrypt(encryptionKey, new TextEncoder().encode(payload)),
  );

  const blobHolder = uuid.v4();
  const blobHashBase64 = await crypto
    .createHash('sha256')
    .update(encryptedPayloadBuffer)
    .digest('base64');

  const blobHash = toBase64URL(blobHashBase64);

  const formData = new FormData();
  const payloadBlob = new Blob([encryptedPayloadBuffer]);

  formData.append('blob_hash', blobHash);
  formData.append('blob_data', payloadBlob);

  const assignHolderPromise = fetch(
    makeBlobServiceEndpointURL(blobService.httpEndpoints.ASSIGN_HOLDER),
    {
      method: blobService.httpEndpoints.ASSIGN_HOLDER.method,
      body: JSON.stringify({
        holder: blobHolder,
        blob_hash: blobHash,
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

  try {
    const [assignHolderResponse, uploadBlobResponse] = await Promise.all([
      assignHolderPromise,
      uploadHolderPromise,
    ]);

    if (!assignHolderResponse.ok) {
      const { status, statusText } = assignHolderResponse;
      return {
        blobUploadError: `Holder assignment failed with HTTP ${status}: ${statusText}`,
      };
    }

    if (!uploadBlobResponse.ok) {
      const { status, statusText } = uploadBlobResponse;
      return {
        blobUploadError: `Payload upload failed with HTTP ${status}: ${statusText}`,
      };
    }
  } catch (e) {
    return {
      blobUploadError: `Payload upload failed with: ${
        getMessageForException(e) ?? 'unknown error'
      }`,
    };
  }

  const encryptionKeyString = Buffer.from(encryptionKey).toString('base64');
  return {
    blobHash,
    encryptionKey: encryptionKeyString,
  };
}

export { upload };
