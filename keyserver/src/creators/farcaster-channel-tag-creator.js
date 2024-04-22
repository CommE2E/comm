// @flow

import uuid from 'uuid';

import {
  GATE_TAG_FARCASTER_CHANNEL,
  farcasterChannelTagBlobHash,
} from 'lib/shared/community-utils.js';
import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
} from 'lib/types/community-types.js';
import { ServerError } from 'lib/utils/errors.js';

import {
  uploadBlob,
  assignHolder,
  download,
  type BlobOperationResult,
  type BlobDownloadResult,
} from '../services/blob.js';
import { Viewer } from '../session/viewer.js';

async function createOrUpdateFarcasterChannelTag(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  const { commCommunityID, farcasterChannelID } = request;

  if (GATE_TAG_FARCASTER_CHANNEL) {
    throw new ServerError('internal_error');
  }

  const blobDownload = await getFarcasterChannelTagBlob(farcasterChannelID);

  if (blobDownload.found) {
    throw new ServerError('already_in_use');
  }

  const blobHolder = uuid.v4();

  const blobResult = await uploadFarcasterChannelTagBlob(
    commCommunityID,
    farcasterChannelID,
    blobHolder,
  );

  if (!blobResult.success) {
    if (blobResult.reason === 'HASH_IN_USE') {
      throw new ServerError('already_in_use');
    } else {
      throw new ServerError('unknown_error');
    }
  }

  return {
    commCommunityID,
    blobHolder,
  };
}

function getFarcasterChannelTagBlob(
  secret: string,
): Promise<BlobDownloadResult> {
  const hash = farcasterChannelTagBlobHash(secret);

  return download(hash);
}

async function uploadFarcasterChannelTagBlob(
  commCommunityID: string,
  farcasterChannelID: string,
  holder: string,
): Promise<BlobOperationResult> {
  const payload = {
    commCommunityID,
    farcasterChannelID,
  };
  const payloadString = JSON.stringify(payload);

  const hash = farcasterChannelTagBlobHash(farcasterChannelID);
  const blob = new Blob([payloadString]);

  const uploadResult = await uploadBlob(blob, hash);

  if (!uploadResult.success) {
    return uploadResult;
  }

  return await assignHolder({ holder, hash });
}

export { createOrUpdateFarcasterChannelTag, uploadFarcasterChannelTagBlob };
