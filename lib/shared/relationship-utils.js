// @flow

import invariant from 'invariant';

import {
  type RelationshipButton,
  type UserRelationshipStatus,
  userRelationshipStatus,
  relationshipButtons,
  relationshipActions,
  type RelationshipAction,
} from '../types/relationship-types';
import type { UserInfo } from '../types/user-types';

function sortIDs(firstId: string, secondId: string): string[] {
  return [Number(firstId), Number(secondId)]
    .sort((a, b) => a - b)
    .map(num => num.toString());
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
  relationshipStatus: UserRelationshipStatus,
): boolean {
  return (
    relationshipStatus === userRelationshipStatus.BLOCKED_VIEWER ||
    relationshipStatus === userRelationshipStatus.BLOCKED_BY_VIEWER ||
    relationshipStatus === userRelationshipStatus.BOTH_BLOCKED
  );
}

function getRelationshipDispatchAction(
  relationshipButton: RelationshipButton,
): RelationshipAction {
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

export {
  sortIDs,
  getAvailableRelationshipButtons,
  relationshipBlockedInEitherDirection,
  getRelationshipDispatchAction,
};
