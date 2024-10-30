// @flow

import type {
  ServerCommunityInfo,
  ServerCommunityInfoWithCommunityName,
} from 'lib/types/community-types.js';

import { fetchThreadInfos } from './thread-fetchers.js';
import { dbQuery, SQL } from '../database/database.js';
import { createScriptViewer } from '../session/scripts.js';
import { Viewer } from '../session/viewer.js';
import { thisKeyserverAdmin } from '../user/identity.js';

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

async function fetchAllCommunityInfosWithNames(): Promise<
  $ReadOnlyArray<ServerCommunityInfoWithCommunityName>,
> {
  const query = SQL`
    SELECT c.id, t.name as communityName,
      c.farcaster_channel_id as farcasterChannelID
    FROM communities c
    INNER JOIN threads t ON c.id = t.id
  `;

  const [[result], admin] = await Promise.all([
    dbQuery(query),
    thisKeyserverAdmin(),
  ]);

  const threadIDs = new Set(result.map(row => row.id.toString()));

  const adminViewer = createScriptViewer(admin.id);

  const threadInfosResult = await fetchThreadInfos(adminViewer, {
    threadIDs,
  });

  const communityInfos = result.map(row => ({
    id: row.id.toString(),
    farcasterChannelID: row.farcasterChannelID,
    communityName: row.communityName,
    threadInfo: threadInfosResult.threadInfos[row.id.toString()] ?? null,
  }));

  return communityInfos;
}

export {
  fetchCommunityInfos,
  fetchCommunityFarcasterChannelTag,
  fetchAllCommunityInfosWithNames,
};
