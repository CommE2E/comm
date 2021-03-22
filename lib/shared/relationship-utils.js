// @flow

import {
  type RelationshipButton,
  type UserRelationshipStatus,
  userRelationshipStatus,
  relationshipButtons,
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

export {
  sortIDs,
  getAvailableRelationshipButtons,
  relationshipBlockedInEitherDirection,
};
