// @flow

import t, { type TInterface } from 'tcomb';

import {
  serverCommunityInfoValidator,
  type FetchCommunityInfosResponse,
} from 'lib/types/community-types.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { fetchCommunityInfos } from '../fetchers/community-fetchers.js';
import { Viewer } from '../session/viewer.js';

const fetchCommunityInfosResponseValidator: TInterface<FetchCommunityInfosResponse> =
  tShape({
    communityInfos: t.list(serverCommunityInfoValidator),
  });

async function fetchCommunityInfosResponder(
  viewer: Viewer,
): Promise<FetchCommunityInfosResponse> {
  const communitiesWithHolder = await fetchCommunityInfos(viewer);

  const communityInfos = communitiesWithHolder.map(community => ({
    id: community.id,
    farcasterChannelID: community.farcasterChannelID,
  }));

  return { communityInfos };
}

export { fetchCommunityInfosResponseValidator, fetchCommunityInfosResponder };
