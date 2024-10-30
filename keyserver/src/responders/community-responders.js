// @flow

import type {
  FetchCommunityInfosResponse,
  ServerFetchAllCommunityInfosWithNamesResponse,
} from 'lib/types/community-types.js';

import {
  fetchCommunityInfos,
  fetchAllCommunityInfosWithNames,
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

async function fetchAllCommunityInfosWithNamesResponder(
  viewer: Viewer,
): Promise<ServerFetchAllCommunityInfosWithNamesResponse> {
  if (!viewer.loggedIn) {
    return { allCommunityInfosWithNames: [] };
  }

  const allCommunityInfosWithNames =
    await fetchAllCommunityInfosWithNames(viewer);

  return { allCommunityInfosWithNames };
}

export {
  fetchCommunityInfosResponder,
  fetchAllCommunityInfosWithNamesResponder,
};
