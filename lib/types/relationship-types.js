// @flow

import { values } from '../utils/objects';

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

export const relationshipActions = Object.freeze({
  FRIEND: 'friend',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
});
type RelationshipAction = $Values<typeof relationshipActions>;
export const relationshipActionsList: $ReadOnlyArray<RelationshipAction> = values(
  relationshipActions,
);

export type RelationshipRequest = {|
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
|};

type SharedRelationshipRow = {|
  user1: number,
  user2: number,
|};
export type DirectedRelationshipRow = {|
  ...SharedRelationshipRow,
  status: DirectedStatus,
|};
export type UndirectedRelationshipRow = {|
  ...SharedRelationshipRow,
  status: UndirectedStatus,
|};

export type RelationshipErrors = $Shape<{|
  invalid_user: string[],
  already_friends: string[],
  user_blocked: string[],
|}>;
