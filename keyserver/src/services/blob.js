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
  blob: Blob,
  hash: string,
): Promise<BlobOperationResult> {
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

async function deleteBlob(params: BlobDescriptor, instant?: boolean) {
  const { hash, holder } = params;
  const endpoint = blobService.httpEndpoints.DELETE_BLOB;
  const url = makeBlobServiceEndpointURL(endpoint);
  await fetch(url, {
    method: endpoint.method,
    body: JSON.stringify({
      holder,
      blob_hash: hash,
      instant_delete: !!instant,
    }),
    headers: {
      'content-type': 'application/json',
    },
  });
}

export { upload, uploadBlob, assignHolder, download, deleteBlob };
