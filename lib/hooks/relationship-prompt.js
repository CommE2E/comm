// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useSelector } from 'react-redux';

import {
  updateRelationships as serverUpdateRelationships,
  updateRelationshipsActionTypes,
} from '../actions/relationship-actions';
import { getSingleOtherUser } from '../shared/thread-utils';
import {
  type RelationshipAction,
  relationshipActions,
} from '../types/relationship-types';
import type { ThreadInfo } from '../types/thread-types';
import type { UserInfo } from '../types/user-types';
import { useDispatchActionPromise, useServerCall } from '../utils/action-utils';

type RelationshipPromptData = {
  +otherUserInfo: ?UserInfo,
  +callbacks: {
    +blockUser: () => void,
    +unblockUser: () => void,
    +friendUser: () => void,
    +unfriendUser: () => void,
  },
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

  const callUpdateRelationships = useServerCall(serverUpdateRelationships);
  const updateRelationship = React.useCallback(
    async (action: RelationshipAction) => {
      try {
        invariant(otherUserInfo, 'Other user info should be present');
        return await callUpdateRelationships({
          action,
          userIDs: [otherUserInfo.id],
        });
      } catch (e) {
        onErrorCallback?.();
        throw e;
      }
    },
    [callUpdateRelationships, onErrorCallback, otherUserInfo],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const onButtonPress = React.useCallback(
    (action: RelationshipAction) => {
      invariant(
        otherUserInfo,
        'User info should be present when a button is clicked',
      );
      dispatchActionPromise(
        updateRelationshipsActionTypes,
        updateRelationship(action),
      );
    },
    [dispatchActionPromise, otherUserInfo, updateRelationship],
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
  return {
    otherUserInfo,
    callbacks: {
      blockUser,
      unblockUser,
      friendUser,
      unfriendUser,
    },
  };
}

export { useRelationshipPrompt };
