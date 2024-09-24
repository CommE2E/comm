// @flow

import type {
  FetchCommunityInfosResponse,
  FetchAllCommunityInfosWithNamesResponse,
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
): Promise<FetchAllCommunityInfosWithNamesResponse> {
  if (!viewer.loggedIn) {
    return { allCommunityInfosWithNames: [] };
  }

  const allCommunityInfosWithNames = await fetchAllCommunityInfosWithNames();

  return { allCommunityInfosWithNames };
}

export {
  fetchCommunityInfosResponder,
  fetchAllCommunityInfosWithNamesResponder,
};
