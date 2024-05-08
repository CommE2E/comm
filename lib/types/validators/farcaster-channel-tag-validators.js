// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tID } from '../../utils/validation-utils.js';
import type { CreateOrUpdateFarcasterChannelTagResponse } from '../community-types';

export const createOrUpdateFarcasterChannelTagResponseValidator: TInterface<CreateOrUpdateFarcasterChannelTagResponse> =
  tShape<CreateOrUpdateFarcasterChannelTagResponse>({
    commCommunityID: tID,
    blobHolder: t.String,
  });
