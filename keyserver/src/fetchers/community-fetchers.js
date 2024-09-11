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
  communityIDs?: $ReadOnlyArray<string>,
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

  if (communityIDs && communityIDs.length > 0) {
    query.append(SQL`
      AND c.id IN (${communityIDs})
    `);
  }

  const [result] = await dbQuery(query);

  const communityInfos = result.map(row => ({
    id: row.id.toString(),
    farcasterChannelID: row.farcasterChannelID,
    blobHolder: row.blobHolder,
  }));

  return communityInfos;
}

async function fetchCommunityFarcasterChannelTag(
  viewer: Viewer,
  communityID: string,
): Promise<?string> {
  if (!viewer.loggedIn) {
    return null;
  }

  const query = SQL`
    SELECT c.farcaster_channel_id as farcasterChannelID
    FROM communities c
    WHERE c.id = ${communityID}
  `;

  const [result] = await dbQuery(query);

  const communityInfo = result[0];

  return communityInfo?.farcasterChannelID;
}

export { fetchCommunityInfos, fetchCommunityFarcasterChannelTag };
