// @flow

import type {
  FetchCommunityInfosResponse,
  ServerFetchNativeDrawerAndDirectoryInfosResponse,
} from 'lib/types/community-types.js';

import {
  fetchCommunityInfos,
  fetchNativeDrawerAndDirectoryInfos,
} from '../fetchers/community-fetchers.js';
import { Viewer } from '../session/viewer.js';

async function fetchCommunityInfosResponder(
  viewer: Viewer,
): Promise<FetchCommunityInfosResponse> {
  const fetchedCommunities = await fetchCommunityInfos(viewer);

  const communityInfos = fetchedCommunities.map(community => ({
    id: community.id,
    farcasterChannelID: community.farcasterChannelID,
  }));

  return { communityInfos };
}

async function fetchNativeDrawerAndDirectoryInfosResponder(
  viewer: Viewer,
): Promise<ServerFetchNativeDrawerAndDirectoryInfosResponse> {
  if (!viewer.loggedIn) {
    return { allCommunityInfosWithNames: [] };
  }

  const allCommunityInfosWithNames =
    await fetchNativeDrawerAndDirectoryInfos(viewer);

  return { allCommunityInfosWithNames };
}

export {
  fetchCommunityInfosResponder,
  fetchNativeDrawerAndDirectoryInfosResponder,
};
