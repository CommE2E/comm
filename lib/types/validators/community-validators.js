// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  serverCommunityInfoValidator,
  serverCommunityInfoWithCommunityNameValidator,
  type FetchCommunityInfosResponse,
  type ServerFetchAllCommunityInfosWithNamesResponse,
} from '../community-types.js';

const fetchCommunityInfosResponseValidator: TInterface<FetchCommunityInfosResponse> =
  tShape({
    communityInfos: t.list(serverCommunityInfoValidator),
  });

const fetchAllCommunityInfosWithNamesResponseValidator: TInterface<ServerFetchAllCommunityInfosWithNamesResponse> =
  tShape({
    allCommunityInfosWithNames: t.list(
      serverCommunityInfoWithCommunityNameValidator,
    ),
  });

export {
  fetchCommunityInfosResponseValidator,
  fetchAllCommunityInfosWithNamesResponseValidator,
};
