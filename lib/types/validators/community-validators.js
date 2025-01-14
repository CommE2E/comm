// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  serverCommunityInfoValidator,
  clientCommunityInfoWithCommunityNameValidator,
  type FetchCommunityInfosResponse,
  type ClientFetchNativeDrawerAndDirectoryInfosResponse,
} from '../community-types.js';

const fetchCommunityInfosResponseValidator: TInterface<FetchCommunityInfosResponse> =
  tShape({
    communityInfos: t.list(serverCommunityInfoValidator),
  });

const fetchNativeDrawerAndDirectoryInfosResponseValidator: TInterface<ClientFetchNativeDrawerAndDirectoryInfosResponse> =
  tShape({
    allCommunityInfosWithNames: t.list(
      clientCommunityInfoWithCommunityNameValidator,
    ),
  });

export {
  fetchCommunityInfosResponseValidator,
  fetchNativeDrawerAndDirectoryInfosResponseValidator,
};
