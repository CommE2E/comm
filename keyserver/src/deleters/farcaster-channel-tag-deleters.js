// @flow

import { farcasterChannelTagBlobHash } from 'lib/shared/community-utils.js';
import type { DeleteFarcasterChannelTagRequest } from 'lib/types/community-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';

import { dbQuery, SQL } from '../database/database.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import { deleteBlob } from '../services/blob.js';
import type { Viewer } from '../session/viewer';
import { updateThread } from '../updaters/thread-updaters.js';

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

  // In the background, we fetch information about the community thread. If the
  // thread's avatar type is `farcaster`, we remove it.
  ignorePromiseRejections(
    (async () => {
      const serverThreadInfos = await fetchServerThreadInfos({
        threadID: request.commCommunityID,
      });
      const { avatar } = serverThreadInfos.threadInfos[request.commCommunityID];
      if (avatar?.type !== 'farcaster') {
        return;
      }

      await updateThread(viewer, {
        threadID: request.commCommunityID,
        changes: { avatar: { type: 'remove' } },
      });
    })(),
  );
}

export { deleteFarcasterChannelTag };
