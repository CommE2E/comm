// @flow

import type { FetchCommunityInfosResponse } from 'lib/types/community-types.js';

import { fetchCommunityInfos } from '../fetchers/community-fetchers.js';
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

export { fetchCommunityInfosResponder };
