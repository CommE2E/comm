// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  serverCommunityInfoValidator,
  clientCommunityInfoWithCommunityNameValidator,
  type FetchCommunityInfosResponse,
  type ClientFetchAllCommunityInfosWithNamesResponse,
} from '../community-types.js';

const fetchCommunityInfosResponseValidator: TInterface<FetchCommunityInfosResponse> =
  tShape({
    communityInfos: t.list(serverCommunityInfoValidator),
  });

const fetchAllCommunityInfosWithNamesResponseValidator: TInterface<ClientFetchAllCommunityInfosWithNamesResponse> =
  tShape({
    allCommunityInfosWithNames: t.list(
      clientCommunityInfoWithCommunityNameValidator,
    ),
  });

export {
  fetchCommunityInfosResponseValidator,
  fetchAllCommunityInfosWithNamesResponseValidator,
};
