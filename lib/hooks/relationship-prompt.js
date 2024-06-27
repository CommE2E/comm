// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
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

  const callUpdateRelationships = useLegacyAshoatKeyserverCall(
    serverUpdateRelationships,
  );
  const updateRelationship = React.useCallback(
    async (
      action: TraditionalRelationshipAction,
      setInProgress: boolean => mixed,
    ) => {
      try {
        invariant(otherUserID, 'Other user info id should be present');
        return await callUpdateRelationships({
          action,
          userIDs: [otherUserID],
        });
      } catch (e) {
        onErrorCallback?.();
        throw e;
      } finally {
        setInProgress(false);
      }
    },
    [callUpdateRelationships, onErrorCallback, otherUserID],
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

  const blockUser = React.useCallback(() => {
    setIsLoadingBlockUser(true);
    onButtonPress(relationshipActions.BLOCK, setIsLoadingBlockUser);
  }, [onButtonPress]);
  const unblockUser = React.useCallback(() => {
    setIsLoadingUnblockUser(true);
    onButtonPress(relationshipActions.UNBLOCK, setIsLoadingUnblockUser);
  }, [onButtonPress]);
  const friendUser = React.useCallback(() => {
    setIsLoadingFriendUser(true);
    onButtonPress(relationshipActions.FRIEND, setIsLoadingFriendUser);
  }, [onButtonPress]);
  const unfriendUser = React.useCallback(() => {
    setIsLoadingUnfriendUser(true);
    onButtonPress(relationshipActions.UNFRIEND, setIsLoadingUnfriendUser);
  }, [onButtonPress]);

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
