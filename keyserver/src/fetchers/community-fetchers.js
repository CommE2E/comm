// @flow

import type {
  ServerCommunityInfo,
  ServerCommunityInfoWithCommunityName,
} from 'lib/types/community-types.js';

import { fetchPrivilegedThreadInfos } from './thread-fetchers.js';
import { viewerIsMemberOfThreads } from './thread-permission-fetchers.js';
import { dbQuery, SQL, mergeAndConditions } from '../database/database.js';
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
  `;
  if (!viewer.isScriptViewer) {
    query.append(SQL`
      INNER JOIN memberships m
        ON c.id = m.thread AND m.user = ${viewer.userID}
    `);
  }

  const conditions = [];
  if (!viewer.isScriptViewer) {
    conditions.push(SQL`m.role > 0`);
  }
  if (communityIDs && communityIDs.length > 0) {
    conditions.push(SQL`
      c.id IN (${communityIDs})
    `);
  }
  if (conditions.length > 0) {
    const clause = mergeAndConditions(conditions);
    query.append(SQL`WHERE `);
    query.append(clause);
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

const boostedCommunityIDs = new Set([
  '7818315', // music
  '7856597', // nba
  '7796817', // new-york
  '7817640', // screens
  '7793856', // founders
  '7817366', // ai
  '7830533', // geopolitics
  '7802020', // sofi
  '7856523', // nfl
  '7856570', // football
  '7796490', // food
  '7799897', // dev
  '79486314', // mlb
  '7801839', // art
  '7799649', // travel
  '79264622', // privacy
]);

async function fetchNativeDrawerAndDirectoryInfos(
  viewer: Viewer,
): Promise<$ReadOnlyArray<ServerCommunityInfoWithCommunityName>> {
  const query = SQL`
    SELECT c.id, t.name as communityName,
      c.farcaster_channel_id as farcasterChannelID
    FROM communities c
    INNER JOIN threads t ON c.id = t.id
  `;

  const [result] = await dbQuery(query);

  const threadIDs = result.map(row => row.id.toString());

  const membershipMap = await viewerIsMemberOfThreads(viewer, threadIDs);

  // We want to return all public communities (i.e. community has an associated
  // Farcaster channel) and any private communities of which the viewer is a
  // member
  const filteredResult = result.filter(
    row => !!row.farcasterChannelID || membershipMap.get(row.id.toString()),
  );

  const filteredThreadIDs = new Set(
    filteredResult.map(row => row.id.toString()),
  );

  const threadInfosResult = await fetchPrivilegedThreadInfos(viewer, {
    threadIDs: filteredThreadIDs,
  });

  const communityInfos = filteredResult.map(
    (row): ServerCommunityInfoWithCommunityName => ({
      id: row.id.toString(),
      farcasterChannelID: row.farcasterChannelID,
      communityName: row.communityName,
      threadInfo: threadInfosResult.threadInfos[row.id.toString()] ?? null,
    }),
  );

  communityInfos.sort((a, b) => {
    return (
      (boostedCommunityIDs.has(b.id) ? 1 : 0) -
      (boostedCommunityIDs.has(a.id) ? 1 : 0)
    );
  });

  return communityInfos;
}

export {
  fetchCommunityInfos,
  fetchCommunityFarcasterChannelTag,
  fetchNativeDrawerAndDirectoryInfos,
};
