// @flow

import type { BlobHashAndHolder } from 'lib/types/holder-types.js';
import {
  downloadBlob,
  removeBlobHolder,
  assignBlobHolder,
} from 'lib/utils/blob-service.js';
import {
  uploadBlob,
  removeMultipleHolders,
  type BlobOperationResult,
} from 'lib/utils/blob-service.js';
import { createHTTPAuthorizationHeader } from 'lib/utils/services-utils.js';

import { clearIdentityInfo } from '../user/identity.js';
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
  const { hash: blobHash, holder } = params;
  const headers = await createRequestHeaders(false);
  const assignResult = await assignBlobHolder({ blobHash, holder }, headers);
  if (!assignResult.success && assignResult.reason === 'INVALID_CSAT') {
    await clearIdentityInfo();
  }
  return assignResult;
}

async function uploadBlobKeyserverWrapper(
  blob: Blob,
  hash: string,
): Promise<BlobOperationResult> {
  const authHeaders = await createRequestHeaders(false);
  const uploadResult = await uploadBlob(blob, hash, authHeaders);
  if (!uploadResult.success && uploadResult.reason === 'INVALID_CSAT') {
    await clearIdentityInfo();
  }
  return uploadResult;
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

  if (blobResult.result === 'error') {
    return { found: false, status: blobResult.status };
  } else if (blobResult.result === 'invalid_csat') {
    await clearIdentityInfo();
    return { found: false, status: 401 };
  }
  const blob = await blobResult.response.blob();
  return { found: true, blob };
}

async function deleteBlob(params: BlobDescriptor, instant?: boolean) {
  const { hash: blobHash, holder } = params;
  const headers = await createRequestHeaders();
  const removeResult = await removeBlobHolder(
    { blobHash, holder },
    headers,
    instant,
  );
  if (!removeResult.success && removeResult.reason === 'INVALID_CSAT') {
    await clearIdentityInfo();
  }
}

async function removeBlobHolders(holders: $ReadOnlyArray<BlobHashAndHolder>) {
  const headers = await createRequestHeaders(false);
  const removeResult = await removeMultipleHolders(holders, headers);
  if (removeResult.result === 'invalid_csat') {
    await clearIdentityInfo();
  }
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
