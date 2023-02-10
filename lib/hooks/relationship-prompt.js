// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useSelector } from 'react-redux';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions.js';
import { getSingleOtherUser } from '../shared/thread-utils.js';
import {
  type RelationshipAction,
  relationshipActions,
} from '../types/relationship-types.js';
import type { ThreadInfo } from '../types/thread-types.js';
import type { UserInfo } from '../types/user-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';

type RelationshipCallbacks = {
  +blockUser: () => void,
  +unblockUser: () => void,
  +friendUser: () => void,
  +unfriendUser: () => void,
};

type RelationshipPromptData = {
  +otherUserInfo: ?UserInfo,
  +callbacks: RelationshipCallbacks,
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

  const callbacks = useRelationshipCallbacks(
    otherUserInfo?.id,
    onErrorCallback,
  );

  return React.useMemo(
    () => ({
      otherUserInfo,
      callbacks,
    }),
    [callbacks, otherUserInfo],
  );
}

function useRelationshipCallbacks(
  otherUserID?: string,
  onErrorCallback?: () => void,
): RelationshipCallbacks {
  const callUpdateRelationships = useServerCall(serverUpdateRelationships);
  const updateRelationship = React.useCallback(
    async (action: RelationshipAction) => {
      try {
        invariant(otherUserID, 'Other user info id should be present');
        return await callUpdateRelationships({
          action,
          userIDs: [otherUserID],
        });
      } catch (e) {
        onErrorCallback?.();
        throw e;
      }
    },
    [callUpdateRelationships, onErrorCallback, otherUserID],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const onButtonPress = React.useCallback(
    (action: RelationshipAction) => {
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationship(action),
      );
    },
    [dispatchActionPromise, updateRelationship],
  );

  const blockUser = React.useCallback(
    () => onButtonPress(relationshipActions.BLOCK),
    [onButtonPress],
  );
  const unblockUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNBLOCK),
    [onButtonPress],
  );
  const friendUser = React.useCallback(
    () => onButtonPress(relationshipActions.FRIEND),
    [onButtonPress],
  );
  const unfriendUser = React.useCallback(
    () => onButtonPress(relationshipActions.UNFRIEND),
    [onButtonPress],
  );

  return React.useMemo(
    () => ({
      blockUser,
      unblockUser,
      friendUser,
      unfriendUser,
    }),
    [blockUser, friendUser, unblockUser, unfriendUser],
  );
}

export { useRelationshipPrompt, useRelationshipCallbacks };
