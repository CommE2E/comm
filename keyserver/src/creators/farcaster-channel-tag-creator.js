// @flow

import uuid from 'uuid';

import { farcasterChannelTagBlobHash } from 'lib/shared/community-utils.js';
import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
} from 'lib/types/community-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { BlobOperationResult } from 'lib/utils/blob-service.js';
import { ServerError } from 'lib/utils/errors.js';

import {
  dbQuery,
  SQL,
  MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE,
} from '../database/database.js';
import { fetchCommunityInfos } from '../fetchers/community-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import {
  uploadBlobKeyserverWrapper,
  assignHolder,
  download,
  deleteBlob,
  type BlobDownloadResult,
} from '../services/blob.js';
import { Viewer } from '../session/viewer.js';
import { thisKeyserverID } from '../user/identity.js';
import { neynarClient } from '../utils/fc-cache.js';
import { getAndAssertKeyserverURLFacts } from '../utils/urls.js';

async function createOrUpdateFarcasterChannelTag(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  const permissionPromise = checkThreadPermission(
    viewer,
    request.commCommunityID,
    threadPermissions.MANAGE_FARCASTER_CHANNEL_TAGS,
  );

  const neynarChannelDescriptionPromise = (async () => {
    if (!neynarClient) {
      return '';
    }
    const channelInfo = await neynarClient?.fetchFarcasterChannelByID(
      request.farcasterChannelID,
    );
    if (!channelInfo) {
      return '';
    }
    return channelInfo.description;
  })();

  const [
    hasPermission,
    communityInfos,
    blobDownload,
    keyserverID,
    neynarChannelDescription,
  ] = await Promise.all([
    permissionPromise,
    fetchCommunityInfos(viewer, [request.commCommunityID]),
    getFarcasterChannelTagBlob(request.farcasterChannelID),
    thisKeyserverID(),
    neynarChannelDescriptionPromise,
  ]);

  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  if (communityInfos.length !== 1) {
    throw new ServerError('invalid_parameters');
  }

  if (blobDownload.found) {
    throw new ServerError('already_in_use');
  }

  const communityID = `${keyserverID}|${request.commCommunityID}`;
  const blobHolder = uuid.v4();

  const blobResult = await uploadFarcasterChannelTagBlob(
    communityID,
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

    UPDATE threads
    SET
      avatar = '{"type":"farcaster"}'
    WHERE id = ${request.commCommunityID}
      AND avatar IS NULL;

    UPDATE threads
    SET
      description = ${neynarChannelDescription}
    WHERE id = ${request.commCommunityID}
      AND (description IS NULL OR description = '');

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
  const { baseDomain, basePath } = getAndAssertKeyserverURLFacts();
  const keyserverURL = baseDomain + basePath;

  const payload = {
    commCommunityID,
    farcasterChannelID,
    keyserverURL,
  };
  const payloadString = JSON.stringify(payload);

  const hash = farcasterChannelTagBlobHash(farcasterChannelID);
  const blob = new Blob([payloadString]);

  const uploadResult = await uploadBlobKeyserverWrapper(blob, hash);

  if (!uploadResult.success) {
    return uploadResult;
  }

  return await assignHolder({ holder, hash });
}

export { createOrUpdateFarcasterChannelTag, uploadFarcasterChannelTagBlob };
