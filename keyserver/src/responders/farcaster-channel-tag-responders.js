// @flow

import t, { type TInterface } from 'tcomb';

import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
  DeleteFarcasterChannelTagRequest,
  DeleteFarcasterChannelTagResponse,
} from 'lib/types/community-types';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import { createOrUpdateFarcasterChannelTag } from '../creators/farcaster-channel-tag-creator.js';
import { deleteFarcasterChannelTag } from '../deleters/farcaster-channel-tag-deleters.js';
import type { Viewer } from '../session/viewer';

const createOrUpdateFarcasterChannelTagInputValidator: TInterface<CreateOrUpdateFarcasterChannelTagRequest> =
  tShape<CreateOrUpdateFarcasterChannelTagRequest>({
    commCommunityID: tID,
    farcasterChannelID: t.String,
  });

function createOrUpdateFarcasterChannelTagResponder(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  return createOrUpdateFarcasterChannelTag(viewer, request);
}

const deleteFarcasterChannelTagInputValidator: TInterface<DeleteFarcasterChannelTagRequest> =
  tShape<DeleteFarcasterChannelTagRequest>({
    commCommunityID: tID,
    farcasterChannelID: t.String,
  });

function deleteFarcasterChannelTagResponder(
  viewer: Viewer,
  request: DeleteFarcasterChannelTagRequest,
): Promise<?DeleteFarcasterChannelTagResponse> {
  return deleteFarcasterChannelTag(viewer, request);
}

export {
  createOrUpdateFarcasterChannelTagResponder,
  createOrUpdateFarcasterChannelTagInputValidator,
  deleteFarcasterChannelTagResponder,
  deleteFarcasterChannelTagInputValidator,
};
