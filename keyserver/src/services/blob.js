// @flow

import blobService from 'lib/facts/blob-service.js';
import {
  getBlobFetchableURL,
  makeBlobServiceEndpointURL,
} from 'lib/utils/blob-service.js';

type BlobDescriptor = {
  +hash: string,
  +holder: string,
};

type BlobOperationResult = 'SUCCESS' | 'FAILURE';
type BlobUploadResult = BlobOperationResult | 'HASH_IN_USE';

async function uploadBlob(blob: Blob, hash: string): Promise<BlobUploadResult> {
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
    const { status } = uploadBlobResponse;

    if (status === 409) {
      return 'HASH_IN_USE';
    }
    return 'FAILURE';
  }

  return 'SUCCESS';
}

async function assignHolder({
  hash,
  holder,
}: BlobDescriptor): Promise<BlobOperationResult> {
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
    return 'FAILURE';
  }

  return 'SUCCESS';
}

async function upload(
  blob: Blob,
  { hash, holder }: BlobDescriptor,
): Promise<BlobUploadResult> {
  try {
    const [holderResult, uploadResult] = await Promise.all([
      assignHolder({ hash, holder }),
      uploadBlob(blob, hash),
    ]);
    if (holderResult === 'FAILURE' || uploadResult === 'FAILURE') {
      return 'FAILURE';
    }
    return uploadResult;
  } catch (e) {
    return 'FAILURE';
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
  const response = await fetch(url, {
    method: blobService.httpEndpoints.GET_BLOB.method,
    headers: {
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    return { found: false };
  }
  const blob = await response.blob();
  return { found: true, blob };
}

async function deleteBlob({ hash, holder }: BlobDescriptor) {
  const endpoint = blobService.httpEndpoints.DELETE_BLOB;
  const url = makeBlobServiceEndpointURL(endpoint);
  await fetch(url, {
    method: endpoint.method,
    body: JSON.stringify({
      holder,
      blob_hash: hash,
    }),
    headers: {
      'content-type': 'application/json',
    },
  });
}

export { upload, uploadBlob, assignHolder, download, deleteBlob };
