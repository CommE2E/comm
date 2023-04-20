// @flow

import type { TRefinement } from 'tcomb';

import type { AccountUserInfo } from './user-types.js';
import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

export const undirectedStatus = Object.freeze({
  KNOW_OF: 0,
  FRIEND: 2,
});
export type UndirectedStatus = $Values<typeof undirectedStatus>;

export const directedStatus = Object.freeze({
  PENDING_FRIEND: 1,
  BLOCKED: 3,
});
export type DirectedStatus = $Values<typeof directedStatus>;

export const userRelationshipStatus = Object.freeze({
  REQUEST_SENT: 1,
  REQUEST_RECEIVED: 2,
  FRIEND: 3,
  BLOCKED_BY_VIEWER: 4,
  BLOCKED_VIEWER: 5,
  BOTH_BLOCKED: 6,
});
export type UserRelationshipStatus = $Values<typeof userRelationshipStatus>;
export const userRelationshipStatusValidator: TRefinement<number> = tNumEnum(
  values(userRelationshipStatus),
);

export const relationshipActions = Object.freeze({
  FRIEND: 'friend',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
});
export type RelationshipAction = $Values<typeof relationshipActions>;
export const relationshipActionsList: $ReadOnlyArray<RelationshipAction> =
  values(relationshipActions);

export const relationshipButtons = Object.freeze({
  FRIEND: 'friend',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
  ACCEPT: 'accept',
  WITHDRAW: 'withdraw',
  REJECT: 'reject',
});
export type RelationshipButton = $Values<typeof relationshipButtons>;

export type RelationshipRequest = {
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
};

type SharedRelationshipRow = {
  user1: string,
  user2: string,
};
export type DirectedRelationshipRow = {
  ...SharedRelationshipRow,
  status: DirectedStatus,
};
export type UndirectedRelationshipRow = {
  ...SharedRelationshipRow,
  status: UndirectedStatus,
};

export type RelationshipErrors = $Shape<{
  invalid_user: string[],
  already_friends: string[],
  user_blocked: string[],
}>;

export type UserRelationships = {
  +friends: $ReadOnlyArray<AccountUserInfo>,
  +blocked: $ReadOnlyArray<AccountUserInfo>,
};
