// @flow

import invariant from 'invariant';
import * as React from 'react';

import { updateRelationshipsActionTypes } from '../actions/relationship-actions.js';
import { useUpdateRelationships } from '../hooks/relationship-hooks.js';
import { getSingleOtherUser } from '../shared/thread-utils.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import {
  relationshipActions,
  type TraditionalRelationshipAction,
} from '../types/relationship-types.js';
import type { UserInfo } from '../types/user-types.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type RelationshipCallbacks = {
  +blockUser: () => void,
  +unblockUser: () => void,
  +friendUser: () => void,
  +unfriendUser: () => void,
};

type RelationshipLoadingState = {
  +isLoadingBlockUser: boolean,
  +isLoadingUnblockUser: boolean,
  +isLoadingFriendUser: boolean,
  +isLoadingUnfriendUser: boolean,
};

type RelationshipPromptData = {
  +otherUserInfo: ?UserInfo,
  +callbacks: RelationshipCallbacks,
  +loadingState: RelationshipLoadingState,
};

function useRelationshipPrompt(
  threadInfo: ThreadInfo,
  onErrorCallback?: () => void,
  pendingPersonalThreadUserInfo?: ?UserInfo,
): RelationshipPromptData {
  // We're fetching the info from state because we need the most recent
  // relationship status. Additionally, member info does not contain info
  // about relationship.
  const otherUserInfo = useSelector(state => {
    const otherUserID =
      getSingleOtherUser(threadInfo, state.currentUserInfo?.id) ??
      pendingPersonalThreadUserInfo?.id;
    const { userInfos } = state.userStore;
    return otherUserID && userInfos[otherUserID]
      ? userInfos[otherUserID]
      : pendingPersonalThreadUserInfo;
  });

  const { callbacks, loadingState } = useRelationshipCallbacks(
    otherUserInfo?.id,
    onErrorCallback,
  );

  return React.useMemo(
    () => ({
      otherUserInfo,
      callbacks,
      loadingState,
    }),
    [callbacks, loadingState, otherUserInfo],
  );
}

function useRelationshipCallbacks(
  otherUserID?: string,
  onErrorCallback?: () => void,
): {
  +callbacks: RelationshipCallbacks,
  +loadingState: RelationshipLoadingState,
} {
  const [isLoadingBlockUser, setIsLoadingBlockUser] = React.useState(false);
  const [isLoadingUnblockUser, setIsLoadingUnblockUser] = React.useState(false);
  const [isLoadingFriendUser, setIsLoadingFriendUser] = React.useState(false);
  const [isLoadingUnfriendUser, setIsLoadingUnfriendUser] =
    React.useState(false);

  const updateRelationships = useUpdateRelationships();
  const updateRelationship = React.useCallback(
    async (
      action: TraditionalRelationshipAction,
      setInProgress: boolean => mixed,
    ) => {
      try {
        setInProgress(true);
        invariant(otherUserID, 'Other user info id should be present');
        return await updateRelationships(action, [otherUserID]);
      } catch (e) {
        onErrorCallback?.();
        throw e;
      } finally {
        setInProgress(false);
      }
    },
    [updateRelationships, onErrorCallback, otherUserID],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const onButtonPress = React.useCallback(
    (
      action: TraditionalRelationshipAction,
      setInProgress: boolean => mixed,
    ) => {
      void dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationship(action, setInProgress),
      );
    },
    [dispatchActionPromise, updateRelationship],
  );

  const blockUser = React.useCallback(
    () => onButtonPress(relationshipActions.BLOCK, setIsLoadingBlockUser),
    [onButtonPress],
  );
  const unblockUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNBLOCK, setIsLoadingUnblockUser),
    [onButtonPress],
  );
  const friendUser = React.useCallback(
    () => onButtonPress(relationshipActions.FRIEND, setIsLoadingFriendUser),
    [onButtonPress],
  );
  const unfriendUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNFRIEND, setIsLoadingUnfriendUser),
    [onButtonPress],
  );

  return React.useMemo(
    () => ({
      callbacks: {
        blockUser,
        unblockUser,
        friendUser,
        unfriendUser,
      },
      loadingState: {
        isLoadingBlockUser,
        isLoadingUnblockUser,
        isLoadingFriendUser,
        isLoadingUnfriendUser,
      },
    }),
    [
      blockUser,
      friendUser,
      isLoadingBlockUser,
      isLoadingFriendUser,
      isLoadingUnblockUser,
      isLoadingUnfriendUser,
      unblockUser,
      unfriendUser,
    ],
  );
}

export { useRelationshipPrompt, useRelationshipCallbacks };
