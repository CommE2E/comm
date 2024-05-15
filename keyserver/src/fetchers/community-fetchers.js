// @flow

import type { ServerCommunityInfo } from 'lib/types/community-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { Viewer } from '../session/viewer.js';

type ServerCommunityInfoWithHolder = $ReadOnly<{
  ...ServerCommunityInfo,
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

async function checkIfFarcasterChannelTagIsValid(
  farcasterChannelID: string,
): Promise<boolean> {
  const query = SQL`
    SELECT id
    FROM communities
    WHERE farcaster_channel_id = ${farcasterChannelID}
  `;

  const [result] = await dbQuery(query);

  return result.length === 1;
}

export { fetchCommunityInfos, checkIfFarcasterChannelTagIsValid };
