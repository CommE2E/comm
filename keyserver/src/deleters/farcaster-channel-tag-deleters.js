// @flow

import {
  DISABLE_TAGGING_FARCASTER_CHANNEL,
  farcasterChannelTagBlobHash,
} from 'lib/shared/community-utils.js';
import type { DeleteFarcasterChannelTagRequest } from 'lib/types/community-types';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { deleteBlob } from '../services/blob.js';
import type { Viewer } from '../session/viewer';

async function deleteFarcasterChannelTag(
  viewer: Viewer,
  request: DeleteFarcasterChannelTagRequest,
): Promise<void> {
  if (DISABLE_TAGGING_FARCASTER_CHANNEL) {
    throw new ServerError('internal_error');
  }

  const query = SQL`
    START TRANSACTION;

    SELECT blob_holder
    INTO @currentBlobHolder
    FROM communities
    WHERE id = ${request.commCommunityID}
      AND farcaster_channel_id = ${request.farcasterChannelID}
    FOR UPDATE;

    UPDATE communities
    SET farcaster_channel_id = NULL, blob_holder = NULL
    WHERE id = ${request.commCommunityID}
      AND farcaster_channel_id = ${request.farcasterChannelID};
    
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
