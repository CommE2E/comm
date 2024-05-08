// @flow

import t, { type TInterface } from 'tcomb';

import type {
  CreateOrUpdateFarcasterChannelTagRequest,
  CreateOrUpdateFarcasterChannelTagResponse,
  DeleteFarcasterChannelTagRequest,
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

async function createOrUpdateFarcasterChannelTagResponder(
  viewer: Viewer,
  request: CreateOrUpdateFarcasterChannelTagRequest,
): Promise<CreateOrUpdateFarcasterChannelTagResponse> {
  return await createOrUpdateFarcasterChannelTag(viewer, request);
}

const deleteFarcasterChannelTagInputValidator: TInterface<DeleteFarcasterChannelTagRequest> =
  tShape<DeleteFarcasterChannelTagRequest>({
    commCommunityID: tID,
    farcasterChannelID: t.String,
    blobHolder: t.String,
  });

async function deleteFarcasterChannelTagResponder(
  viewer: Viewer,
  request: DeleteFarcasterChannelTagRequest,
): Promise<void> {
  await deleteFarcasterChannelTag(viewer, request);
}

export {
  createOrUpdateFarcasterChannelTagResponder,
  createOrUpdateFarcasterChannelTagInputValidator,
  deleteFarcasterChannelTagResponder,
  deleteFarcasterChannelTagInputValidator,
};
