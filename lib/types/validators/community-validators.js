// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  serverCommunityInfoValidator,
  type FetchCommunityInfosResponse,
} from '../community-types.js';

const fetchCommunityInfosResponseValidator: TInterface<FetchCommunityInfosResponse> =
  tShape({
    communityInfos: t.list(serverCommunityInfoValidator),
  });

export { fetchCommunityInfosResponseValidator };
