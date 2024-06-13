// @flow

import uuid from 'uuid';

import {
  DISABLE_TAGGING_FARCASTER_CHANNEL,
  farcasterChannelTagBlobHash,
} from 'lib/shared/community-utils.js';
import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
} from 'lib/types/community-types.js';
import { ServerError } from 'lib/utils/errors.js';

import {
  dbQuery,
  SQL,
  MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE,
} from '../database/database.js';
import { fetchCommunityInfos } from '../fetchers/community-fetchers.js';
import {
  uploadBlob,
  assignHolder,
  download,
  deleteBlob,
  type BlobOperationResult,
  type BlobDownloadResult,
} from '../services/blob.js';
import { Viewer } from '../session/viewer.js';

async function createOrUpdateFarcasterChannelTag(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  if (DISABLE_TAGGING_FARCASTER_CHANNEL) {
    throw new ServerError('internal_error');
  }

  const [communityInfo, blobDownload] = await Promise.all([
    fetchCommunityInfos(viewer, [request.commCommunityID]),
    getFarcasterChannelTagBlob(request.farcasterChannelID),
  ]);

  if (communityInfo.length !== 1) {
    throw new ServerError('invalid_parameters');
  }

  if (blobDownload.found) {
    throw new ServerError('already_in_use');
  }

  const blobHolder = uuid.v4();

  const blobResult = await uploadFarcasterChannelTagBlob(
    request.commCommunityID,
    request.farcasterChannelID,
    blobHolder,
  );

  if (!blobResult.success) {
    if (blobResult.reason === 'HASH_IN_USE') {
      throw new ServerError('already_in_use');
    } else {
      throw new ServerError('unknown_error');
    }
  }

  const query = SQL`
    START TRANSACTION;

    SELECT farcaster_channel_id, blob_holder
      INTO @currentFarcasterChannelID, @currentBlobHolder
    FROM communities
    WHERE id = ${request.commCommunityID}
    FOR UPDATE;

    UPDATE communities
    SET 
      farcaster_channel_id = ${request.farcasterChannelID},
      blob_holder = ${blobHolder}
    WHERE id = ${request.commCommunityID};

    COMMIT;

    SELECT
      @currentFarcasterChannelID AS oldFarcasterChannelID,
      @currentBlobHolder AS oldBlobHolder;
  `;

  try {
    const [transactionResult] = await dbQuery(query, {
      multipleStatements: true,
    });

    const selectResult = transactionResult.pop();
    const [{ oldFarcasterChannelID, oldBlobHolder }] = selectResult;

    if (oldFarcasterChannelID && oldBlobHolder) {
      await deleteBlob(
        {
          hash: farcasterChannelTagBlobHash(oldFarcasterChannelID),
          holder: oldBlobHolder,
        },
        true,
      );
    }
  } catch (error) {
    await deleteBlob(
      {
        hash: farcasterChannelTagBlobHash(request.farcasterChannelID),
        holder: blobHolder,
      },
      true,
    );

    if (error.errno === MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE) {
      throw new ServerError('already_in_use');
    }
    throw new ServerError('invalid_parameters');
  }

  return {
    commCommunityID: request.commCommunityID,
    farcasterChannelID: request.farcasterChannelID,
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
