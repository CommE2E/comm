// @flow

import invariant from 'invariant';

import {
  type RelationshipButton,
  type UserRelationshipStatus,
  userRelationshipStatus,
  relationshipButtons,
  relationshipActions,
  type TraditionalRelationshipAction,
} from '../types/relationship-types.js';
import type { UserInfo } from '../types/user-types.js';

function sortUserIDs(firstId: string, secondId: string): string[] {
  if (!isNaN(Number(firstId)) && !isNaN(Number(secondId))) {
    return [Number(firstId), Number(secondId)]
      .sort((a, b) => a - b)
      .map(num => num.toString());
  } else if (!isNaN(Number(firstId))) {
    return [firstId, secondId];
  } else if (!isNaN(Number(secondId))) {
    return [secondId, firstId];
  }

  return [firstId, secondId].sort();
}

function getAvailableRelationshipButtons(
  userInfo: UserInfo,
): RelationshipButton[] {
  const relationship = userInfo.relationshipStatus;

  if (relationship === userRelationshipStatus.FRIEND) {
    return [relationshipButtons.UNFRIEND, relationshipButtons.BLOCK];
  } else if (relationship === userRelationshipStatus.BLOCKED_VIEWER) {
    return [relationshipButtons.BLOCK];
  } else if (
    relationship === userRelationshipStatus.BOTH_BLOCKED ||
    relationship === userRelationshipStatus.BLOCKED_BY_VIEWER
  ) {
    return [relationshipButtons.UNBLOCK];
  } else if (relationship === userRelationshipStatus.REQUEST_RECEIVED) {
    return [
      relationshipButtons.ACCEPT,
      relationshipButtons.REJECT,
      relationshipButtons.BLOCK,
    ];
  } else if (relationship === userRelationshipStatus.REQUEST_SENT) {
    return [relationshipButtons.WITHDRAW, relationshipButtons.BLOCK];
  } else {
    return [relationshipButtons.FRIEND, relationshipButtons.BLOCK];
  }
}

function relationshipBlockedInEitherDirection(
  relationshipStatus: ?UserRelationshipStatus,
): boolean {
  return (
    relationshipStatus === userRelationshipStatus.BLOCKED_VIEWER ||
    relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
    relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
  );
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getRelationshipDispatchAction(
  relationshipButton: RelationshipButton,
): TraditionalRelationshipAction {
  if (relationshipButton === relationshipButtons.BLOCK) {
    return relationshipActions.BLOCK;
  } else if (
    relationshipButton === relationshipButtons.FRIEND ||
    relationshipButton === relationshipButtons.ACCEPT
  ) {
    return relationshipActions.FRIEND;
  } else if (
    relationshipButton === relationshipButtons.UNFRIEND ||
    relationshipButton === relationshipButtons.REJECT ||
    relationshipButton === relationshipButtons.WITHDRAW
  ) {
    return relationshipActions.UNFRIEND;
  } else if (relationshipButton === relationshipButtons.UNBLOCK) {
    return relationshipActions.UNBLOCK;
  }
  invariant(false, 'relationshipButton conditions should be exhaustive');
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getRelationshipActionText(
  relationshipButton: RelationshipButton,
  username: string,
): string {
  switch (relationshipButton) {
    case relationshipButtons.BLOCK:
      return `Block ${username}`;
    case relationshipButtons.FRIEND:
      return `Add ${username} to friends`;
    case relationshipButtons.UNFRIEND:
      return `Unfriend ${username}`;
    case relationshipButtons.UNBLOCK:
      return `Unblock ${username}`;
    case relationshipButtons.ACCEPT:
      return `Accept friend request from ${username}`;
    case relationshipButtons.REJECT:
      return `Reject friend request from ${username}`;
    case relationshipButtons.WITHDRAW:
      return `Withdraw request to friend ${username}`;
    default:
      invariant(false, 'invalid relationshipButton value');
  }
}

export {
  sortUserIDs,
  getAvailableRelationshipButtons,
  relationshipBlockedInEitherDirection,
  getRelationshipDispatchAction,
  getRelationshipActionText,
};
