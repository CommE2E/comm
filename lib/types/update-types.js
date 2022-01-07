// @flow

import invariant from 'invariant';
import t, { type TInterface, type TUnion } from 'tcomb';

import { tID, tShape, tNumber } from '../utils/validation-utils';
import { type RawEntryInfo, rawEntryInfoValidator } from './entry-types';
import {
  type RawMessageInfo,
  type MessageTruncationStatus,
  rawMessageInfoValidator,
  messageTruncationStatusValidator,
} from './message-types';
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types';
import {
  type UserInfo,
  type AccountUserInfo,
  accountUserInfoValidator,
  type LoggedInUserInfo,
  type OldLoggedInUserInfo,
  loggedInUserInfoValidator,
  oldLoggedInUserInfoValidator,
} from './user-types';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
  UPDATE_THREAD_READ_STATUS: 2,
  DELETE_THREAD: 3,
  JOIN_THREAD: 4,
  BAD_DEVICE_TOKEN: 5,
  UPDATE_ENTRY: 6,
  UPDATE_CURRENT_USER: 7,
  UPDATE_USER: 8,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(ourUpdateType: number): UpdateType {
  invariant(
    ourUpdateType === 0 ||
      ourUpdateType === 1 ||
      ourUpdateType === 2 ||
      ourUpdateType === 3 ||
      ourUpdateType === 4 ||
      ourUpdateType === 5 ||
      ourUpdateType === 6 ||
      ourUpdateType === 7 ||
      ourUpdateType === 8,
    'number is not UpdateType enum',
  );
  return ourUpdateType;
}

type AccountDeletionData = {
  +deletedUserID: string,
};
type ThreadData = {
  +threadID: string,
};
type ThreadReadStatusData = {
  +threadID: string,
  +unread: boolean,
};
type ThreadDeletionData = {
  +threadID: string,
};
type ThreadJoinData = {
  +threadID: string,
};
type BadDeviceTokenData = {
  +deviceToken: string,
};
type EntryData = {
  +entryID: string,
};
type CurrentUserData = {};
type UserData = {
  // ID of the UserInfo being updated
  +updatedUserID: string,
};

type SharedUpdateData = {
  +userID: string,
  +time: number,
};
type AccountDeletionUpdateData = {
  ...SharedUpdateData,
  ...AccountDeletionData,
  +type: 0,
};
type ThreadUpdateData = {
  ...SharedUpdateData,
  ...ThreadData,
  +type: 1,
  +targetSession?: string,
};
type ThreadReadStatusUpdateData = {
  ...SharedUpdateData,
  ...ThreadReadStatusData,
  +type: 2,
};
type ThreadDeletionUpdateData = {
  ...SharedUpdateData,
  ...ThreadDeletionData,
  +type: 3,
};
type ThreadJoinUpdateData = {
  ...SharedUpdateData,
  ...ThreadJoinData,
  +type: 4,
  +targetSession?: string,
};
type BadDeviceTokenUpdateData = {
  ...SharedUpdateData,
  ...BadDeviceTokenData,
  +type: 5,
  +targetCookie: string,
};
type EntryUpdateData = {
  ...SharedUpdateData,
  ...EntryData,
  +type: 6,
  +targetSession: string,
};
type CurrentUserUpdateData = {
  ...SharedUpdateData,
  ...CurrentUserData,
  +type: 7,
};
type UserUpdateData = {
  ...SharedUpdateData,
  ...UserData,
  +type: 8,
  +targetSession?: string,
};
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData
  | ThreadReadStatusUpdateData
  | ThreadDeletionUpdateData
  | ThreadJoinUpdateData
  | BadDeviceTokenUpdateData
  | EntryUpdateData
  | CurrentUserUpdateData
  | UserUpdateData;

type SharedRawUpdateInfo = {
  +id: string,
  +time: number,
};
type AccountDeletionRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...AccountDeletionData,
  +type: 0,
};
type ThreadRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadData,
  +type: 1,
};
type ThreadReadStatusRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadReadStatusData,
  +type: 2,
};
type ThreadDeletionRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadDeletionData,
  +type: 3,
};
type ThreadJoinRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadJoinData,
  +type: 4,
};
type BadDeviceTokenRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...BadDeviceTokenData,
  +type: 5,
};
type EntryRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...EntryData,
  +type: 6,
};
type CurrentUserRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...CurrentUserData,
  +type: 7,
};
type UserRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...UserData,
  +type: 8,
};
export type RawUpdateInfo =
  | AccountDeletionRawUpdateInfo
  | ThreadRawUpdateInfo
  | ThreadReadStatusRawUpdateInfo
  | ThreadDeletionRawUpdateInfo
  | ThreadJoinRawUpdateInfo
  | BadDeviceTokenRawUpdateInfo
  | EntryRawUpdateInfo
  | CurrentUserRawUpdateInfo
  | UserRawUpdateInfo;

type AccountDeletionUpdateInfo = {
  +type: 0,
  +id: string,
  +time: number,
  +deletedUserID: string,
};
export const accountDeletionUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.DELETE_ACCOUNT),
  id: t.String,
  time: t.Number,
  deletedUserID: t.String,
});
type ThreadUpdateInfo = {
  +type: 1,
  +id: string,
  +time: number,
  +threadInfo: RawThreadInfo,
};
export const threadUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.UPDATE_THREAD),
  id: t.String,
  time: t.Number,
  threadInfo: rawThreadInfoValidator,
});
type ThreadReadStatusUpdateInfo = {
  +type: 2,
  +id: string,
  +time: number,
  +threadID: string,
  +unread: boolean,
};
export const threadReadStatusUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.UPDATE_THREAD_READ_STATUS),
  id: t.String,
  time: t.Number,
  threadID: tID,
  unread: t.Boolean,
});
type ThreadDeletionUpdateInfo = {
  +type: 3,
  +id: string,
  +time: number,
  +threadID: string,
};
export const threadDeletionUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.DELETE_THREAD),
  id: t.String,
  time: t.Number,
  threadID: tID,
});

type ThreadJoinUpdateInfo = {
  +type: 4,
  +id: string,
  +time: number,
  +threadInfo: RawThreadInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatus: MessageTruncationStatus,
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
};
export const threadJoinUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.JOIN_THREAD),
  id: t.String,
  time: t.Number,
  threadInfo: rawThreadInfoValidator,
  rawMessageInfos: t.list(rawMessageInfoValidator),
  truncationStatus: messageTruncationStatusValidator,
  rawEntryInfos: t.list(rawEntryInfoValidator),
});
type BadDeviceTokenUpdateInfo = {
  +type: 5,
  +id: string,
  +time: number,
  +deviceToken: string,
};
export const badDeviceTokenUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.BAD_DEVICE_TOKEN),
  id: t.String,
  time: t.Number,
  deviceToken: t.String,
});
type EntryUpdateInfo = {
  +type: 6,
  +id: string,
  +time: number,
  +entryInfo: RawEntryInfo,
};
export const entryUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.UPDATE_ENTRY),
  id: t.String,
  time: t.Number,
  entryInfo: rawEntryInfoValidator,
});
type CurrentUserUpdateInfo = {
  +type: 7,
  +id: string,
  +time: number,
  +currentUserInfo: LoggedInUserInfo,
};

type UserUpdateInfo = {
  +type: 8,
  +id: string,
  +time: number,
  // Updated UserInfo is already contained within the UpdatesResultWithUserInfos
  +updatedUserID: string,
};
export const userUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.UPDATE_USER),
  id: t.String,
  time: t.Number,
  updatedUserID: t.String,
});
export type ClientUpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo
  | ThreadDeletionUpdateInfo
  | ThreadJoinUpdateInfo
  | BadDeviceTokenUpdateInfo
  | EntryUpdateInfo
  | CurrentUserUpdateInfo
  | UserUpdateInfo;

type ServerCurrentUserUpdateInfo = {
  +type: 7,
  +id: string,
  +time: number,
  +currentUserInfo: LoggedInUserInfo | OldLoggedInUserInfo,
};
export const serverCurrentUserUpdateInfoValidator: TInterface = tShape({
  type: tNumber(updateTypes.UPDATE_CURRENT_USER),
  id: t.String,
  time: t.Number,
  currentUserInfo: t.union([
    loggedInUserInfoValidator,
    oldLoggedInUserInfoValidator,
  ]),
});
export type ServerUpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo
  | ThreadDeletionUpdateInfo
  | ThreadJoinUpdateInfo
  | BadDeviceTokenUpdateInfo
  | EntryUpdateInfo
  | ServerCurrentUserUpdateInfo
  | UserUpdateInfo;

export const serverUpdateInfoValidator: TUnion<TInterface> = t.union([
  accountDeletionUpdateInfoValidator,
  threadUpdateInfoValidator,
  threadReadStatusUpdateInfoValidator,
  threadDeletionUpdateInfoValidator,
  threadJoinUpdateInfoValidator,
  badDeviceTokenUpdateInfoValidator,
  entryUpdateInfoValidator,
  serverCurrentUserUpdateInfoValidator,
  userUpdateInfoValidator,
]);

export type ServerUpdatesResult = {
  +currentAsOf: number,
  +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
};
export type ServerUpdatesResultWithUserInfos = {
  +updatesResult: ServerUpdatesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export type ClientUpdatesResult = {
  +currentAsOf: number,
  +newUpdates: $ReadOnlyArray<ClientUpdateInfo>,
};
export type ClientUpdatesResultWithUserInfos = {
  +updatesResult: ClientUpdatesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export type CreateUpdatesResult = {
  +viewerUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  +userInfos: { [id: string]: AccountUserInfo },
};

export type ServerCreateUpdatesResponse = {
  +viewerUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  +userInfos: $ReadOnlyArray<AccountUserInfo>,
};
export const serverCreateUpdatesResponseValidator: TInterface = tShape({
  viewerUpdates: t.list(serverUpdateInfoValidator),
  userInfos: t.list(accountUserInfoValidator),
});

export type ClientCreateUpdatesResponse = {
  +viewerUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  +userInfos: $ReadOnlyArray<AccountUserInfo>,
};

export const processUpdatesActionType = 'PROCESS_UPDATES';
