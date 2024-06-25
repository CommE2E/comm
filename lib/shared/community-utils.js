// @flow

import * as React from 'react';

import {
  createOrUpdateFarcasterChannelTagActionTypes,
  useCreateOrUpdateFarcasterChannelTag,
  deleteFarcasterChannelTagActionTypes,
  useDeleteFarcasterChannelTag,
} from '../actions/community-actions.js';
import { createLoadingStatusSelector } from '../selectors/loading-selectors.js';
import type { SetState } from '../types/hook-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const tagFarcasterChannelErrorMessages: { +[string]: string } = {
  already_in_use: 'This Farcaster channel is already tagged to a community.',
  channel_not_found: 'Could not find a channel with the provided name.',
};

function farcasterChannelTagBlobHash(farcasterChannelID: string): string {
  return `farcaster_channel_tag_${farcasterChannelID}`;
}

const createOrUpdateFarcasterChannelTagStatusSelector =
  createLoadingStatusSelector(createOrUpdateFarcasterChannelTagActionTypes);
function useCreateFarcasterChannelTag(
  commCommunityID: string,
  setError: SetState<?string>,
  onSuccessCallback?: () => mixed,
): {
  +createTag: (farcasterChannelID: string) => mixed,
  +isLoading: boolean,
} {
  const dispatchActionPromise = useDispatchActionPromise();

  const createOrUpdateFarcasterChannelTag =
    useCreateOrUpdateFarcasterChannelTag();

  const createCreateOrUpdateActionPromise = React.useCallback(
    async (farcasterChannelID: string) => {
      try {
        const res = await createOrUpdateFarcasterChannelTag({
          commCommunityID,
          farcasterChannelID,
        });

        onSuccessCallback?.();

        return res;
      } catch (e) {
        setError(e.message);
        throw e;
      }
    },
    [
      commCommunityID,
      createOrUpdateFarcasterChannelTag,
      onSuccessCallback,
      setError,
    ],
  );

  const createTag = React.useCallback(
    (farcasterChannelID: string) => {
      void dispatchActionPromise(
        createOrUpdateFarcasterChannelTagActionTypes,
        createCreateOrUpdateActionPromise(farcasterChannelID),
      );
    },
    [createCreateOrUpdateActionPromise, dispatchActionPromise],
  );

  const createOrUpdateFarcasterChannelTagStatus = useSelector(
    createOrUpdateFarcasterChannelTagStatusSelector,
  );
  const isLoading = createOrUpdateFarcasterChannelTagStatus === 'loading';

  return {
    createTag,
    isLoading,
  };
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

export {
  tagFarcasterChannelErrorMessages,
  farcasterChannelTagBlobHash,
  useCreateFarcasterChannelTag,
  useRemoveFarcasterChannelTag,
};
