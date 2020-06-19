// @flow

export const knowOfFriendsStatus = Object.freeze({
  KNOW_OF: 0,
  FRIEND: 2,
});
export type KnowOfFriendStatus = $Values<typeof knowOfFriendsStatus>;

export const requestsBlocksStatus = Object.freeze({
  PENDING_FRIEND: 1,
  BLOCKED: 3,
});
export type RequestsBlocksStatus = $Values<typeof requestsBlocksStatus>;

type RelationshipAction =
  | 'friend_request'
  | 'accept_friend_request'
  | 'cancel_friend_request'
  | 'unfriend'
  | 'block'
  | 'unblock';
export const relationshipActions = [
  'friend_request',
  'accept_friend_request',
  'cancel_friend_request',
  'unfriend',
  'block',
  'unblock',
];

export type RelationshipRequest = {|
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
|};
