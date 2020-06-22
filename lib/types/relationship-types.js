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

const relationshipActionsObj = Object.freeze({
  SEND_FRIEND_REQUEST: 'send_friend_request',
  ACCEPT_FRIEND_REQUEST: 'accept_friend_request',
  CANCEL_FRIEND_REQUEST: 'cancel_friend_request',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
});
type RelationshipAction = $Values<typeof relationshipActionsObj>;
export const relationshipActions: $ReadOnlyArray<RelationshipAction> = values(
  relationshipActionsObj,
);

export type RelationshipRequest = {|
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
|};

export type RelationshipErrors = {
  invalid_user?: string[],
  already_friends?: string[],
  user_blocked?: string[],
};
