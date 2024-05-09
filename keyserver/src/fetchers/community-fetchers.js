// @flow

import type { CommunityInfo } from 'lib/types/community-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { Viewer } from '../session/viewer.js';

type ServerCommunityInfoWithHolder = $ReadOnly<{
  ...CommunityInfo,
  +id: string,
  +blobHolder: ?string,
}>;

async function fetchCommunityInfos(
  viewer: Viewer,
): Promise<$ReadOnlyArray<ServerCommunityInfoWithHolder>> {
  if (!viewer.loggedIn) {
    return [];
  }

  const query = SQL`
    SELECT c.id, c.farcaster_channel_id as farcasterChannelID,
      c.blob_holder as blobHolder
    FROM communities c
    INNER JOIN memberships m
      ON c.id = m.thread AND m.user = ${viewer.userID}
    WHERE m.role > 0
  `;

  const [result] = await dbQuery(query);

  const communityInfos = result.map(row => ({
    id: row.id.toString(),
    farcasterChannelID: row.farcasterChannelID,
    blobHolder: row.blobHolder,
  }));

  return communityInfos;
}

export { fetchCommunityInfos };
