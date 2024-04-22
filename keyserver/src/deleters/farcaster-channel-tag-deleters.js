// @flow

import {
  DISABLE_TAGGING_FARCASTER_CHANNEL,
  farcasterChannelTagBlobHash,
} from 'lib/shared/community-utils.js';
import type { DeleteFarcasterChannelTagRequest } from 'lib/types/community-types';
import { ServerError } from 'lib/utils/errors.js';

import { deleteBlob } from '../services/blob.js';
import type { Viewer } from '../session/viewer';

async function deleteFarcasterChannelTag(
  viewer: Viewer,
  request: DeleteFarcasterChannelTagRequest,
): Promise<void> {
  const { farcasterChannelID, blobHolder } = request;

  if (DISABLE_TAGGING_FARCASTER_CHANNEL) {
    throw new ServerError('internal_error');
  }

  await deleteBlob(
    {
      hash: farcasterChannelTagBlobHash(farcasterChannelID),
      holder: blobHolder,
    },
    true,
  );
}

export { deleteFarcasterChannelTag };
