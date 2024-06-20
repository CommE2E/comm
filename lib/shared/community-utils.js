// @flow

import * as React from 'react';

import {
  deleteFarcasterChannelTagActionTypes,
  useDeleteFarcasterChannelTag,
} from '../actions/community-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { SetState } from '../types/hook-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function farcasterChannelTagBlobHash(farcasterChannelID: string): string {
  return `farcaster_channel_tag_${farcasterChannelID}`;
}

const deleteFarcasterChannelTagStatusSelector = createLoadingStatusSelector(
  deleteFarcasterChannelTagActionTypes,
);
function useRemoveFarcasterChannelTag(
  commCommunityID: string,
  farcasterChannelID: string,
  setError: SetState<?string>,
): {
  +removeTag: () => mixed,
  +isLoading: boolean,
} {
  const dispatchActionPromise = useDispatchActionPromise();

  const deleteFarcasterChannelTag = useDeleteFarcasterChannelTag();

  const createDeleteActionPromise = React.useCallback(async () => {
    try {
      return await deleteFarcasterChannelTag({
        commCommunityID,
        farcasterChannelID,
      });
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [
    commCommunityID,
    deleteFarcasterChannelTag,
    farcasterChannelID,
    setError,
  ]);

  const removeTag = React.useCallback(() => {
    void dispatchActionPromise(
      deleteFarcasterChannelTagActionTypes,
      createDeleteActionPromise(),
    );
  }, [createDeleteActionPromise, dispatchActionPromise]);

  const deleteFarcasterChannelTagStatus = useSelector(
    deleteFarcasterChannelTagStatusSelector,
  );
  const isLoading = deleteFarcasterChannelTagStatus === 'loading';

  return {
    removeTag,
    isLoading,
  };
}

export { farcasterChannelTagBlobHash, useRemoveFarcasterChannelTag };
