// @flow

import t, { type TInterface } from 'tcomb';

import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
} from 'lib/types/community-types';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import { createOrUpdateFarcasterChannelTag } from '../creators/farcaster-channel-tag-creator.js';
import type { Viewer } from '../session/viewer';

export const createOrUpdateFarcasterChannelTagInputValidator: TInterface<CreateOrUpdateFarcasterChannelTagRequest> =
  tShape<CreateOrUpdateFarcasterChannelTagRequest>({
    commCommunityID: tID,
    farcasterChannelID: t.String,
  });

export const createOrUpdateFarcasterChannelTagResponseValidator: TInterface<CreateOrUpdateFarcasterChannelTagResponse> =
  tShape<CreateOrUpdateFarcasterChannelTagResponse>({
    commCommunityID: tID,
    blobHolder: t.String,
  });

async function createOrUpdateFarcasterChannelTagResponder(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  return await createOrUpdateFarcasterChannelTag(viewer, request);
}

export { createOrUpdateFarcasterChannelTagResponder };
