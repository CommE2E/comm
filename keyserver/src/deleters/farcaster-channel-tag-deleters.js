// @flow

import { farcasterChannelTagBlobHash } from 'lib/shared/community-utils.js';
import type { DeleteFarcasterChannelTagRequest } from 'lib/types/community-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import { deleteBlob } from '../services/blob.js';
import type { Viewer } from '../session/viewer';

async function deleteFarcasterChannelTag(
  viewer: Viewer,
  request: DeleteFarcasterChannelTagRequest,
): Promise<void> {
  const hasPermission = await checkThreadPermission(
    viewer,
    request.commCommunityID,
    threadPermissions.MANAGE_FARCASTER_CHANNEL_TAGS,
  );

  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    START TRANSACTION;

    SELECT blob_holder INTO @currentBlobHolder
    FROM communities
    WHERE id = ${request.commCommunityID}
      AND farcaster_channel_id = ${request.farcasterChannelID}
    FOR UPDATE;

    UPDATE communities
    SET
      farcaster_channel_id = NULL,
      blob_holder = NULL
    WHERE id = ${request.commCommunityID}
      AND farcaster_channel_id = ${request.farcasterChannelID};
    
    UPDATE threads
    SET
      avatar = NULL
    WHERE id = ${request.commCommunityID}
      AND avatar = '{"type":"farcaster"}';

    COMMIT;

    SELECT @currentBlobHolder AS blobHolder;
  `;

  const [transactionResult] = await dbQuery(query, {
    multipleStatements: true,
  });

  const selectResult = transactionResult.pop();
  const [row] = selectResult;

  if (row?.blobHolder) {
    await deleteBlob(
      {
        hash: farcasterChannelTagBlobHash(request.farcasterChannelID),
        holder: row.blobHolder,
      },
      true,
    );
  }
}

export { deleteFarcasterChannelTag };
