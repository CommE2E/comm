// @flow

import type { TInterface, TRefinement } from 'tcomb';
import t from 'tcomb';

import type { AccountUserInfo } from './user-types.js';
import { values } from '../utils/objects.js';
import {
  tUserID,
  tNumEnum,
  tShape,
  tString,
} from '../utils/validation-utils.js';

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
export const userRelationshipStatusValidator: TRefinement<UserRelationshipStatus> =
  tNumEnum(values(userRelationshipStatus));

const traditionalRelationshipActions = Object.freeze({
  FRIEND: 'friend',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
  ACKNOWLEDGE: 'acknowledge',
});

const farcasterRelationshipActions = Object.freeze({
  FARCASTER_MUTUAL: 'farcaster',
});

export const relationshipActions = Object.freeze({
  ...traditionalRelationshipActions,
  ...farcasterRelationshipActions,
});

export type RelationshipAction = $Values<typeof relationshipActions>;
export const relationshipActionsList: $ReadOnlyArray<RelationshipAction> =
  values(relationshipActions);

export type TraditionalRelationshipAction = $Values<
  typeof traditionalRelationshipActions,
>;
export const traditionalRelationshipActionsList: $ReadOnlyArray<TraditionalRelationshipAction> =
  values(traditionalRelationshipActions);

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

export type LegacyTraditionalRelationshipRequest = {
  +action: TraditionalRelationshipAction,
  +userIDs: $ReadOnlyArray<string>,
};

export type LegacyFarcasterRelationshipRequest = {
  +action: 'farcaster',
  +userIDsToFID: { +[userID: string]: string },
};

export type LegacyRelationshipRequest =
  | LegacyTraditionalRelationshipRequest
  | LegacyFarcasterRelationshipRequest;

export type RelationshipRequestUserInfo = {
  +createRobotextInThinThread?: boolean,
};
export type RelationshipRequestWithRobotext = {
  +action: 'farcaster' | 'friend',
  +users: { +[userID: string]: RelationshipRequestUserInfo },
};
export type RelationshipRequestWithoutRobotext = {
  +action: 'unfriend' | 'block' | 'unblock' | 'acknowledge',
  +users: { +[userID: string]: Partial<RelationshipRequestUserInfo> },
};
export type RelationshipRequest =
  | RelationshipRequestWithRobotext
  | RelationshipRequestWithoutRobotext;

export const legacyFarcasterRelationshipRequestValidator: TInterface<LegacyFarcasterRelationshipRequest> =
  tShape<LegacyFarcasterRelationshipRequest>({
    action: tString('farcaster'),
    userIDsToFID: t.dict(tUserID, t.String),
  });

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

export type RelationshipErrors = Partial<{
  +invalid_user: string[],
  +already_friends: string[],
  +user_blocked: string[],
}>;

export type UserRelationships = {
  +friends: $ReadOnlyArray<AccountUserInfo>,
  +blocked: $ReadOnlyArray<AccountUserInfo>,
};
