// @flow

import t, { type TUnion, type TInterface } from 'tcomb';

import { type RawEntryInfo, rawEntryInfoValidator } from './entry-types.js';
import {
  type RawMessageInfo,
  rawMessageInfoValidator,
  type MessageTruncationStatus,
  messageTruncationStatusValidator,
} from './message-types.js';
import { type RawThreadInfo, rawThreadInfoValidator } from './thread-types.js';
import { updateTypes } from './update-types-enum.js';
import {
  type UserInfo,
  userInfoValidator,
  type UserInfos,
  userInfosValidator,
  type LoggedInUserInfo,
  loggedInUserInfoValidator,
} from './user-types.js';
import { tNumber, tShape, tID } from '../utils/validation-utils.js';

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
export type AccountDeletionUpdateData = {
  ...SharedUpdateData,
  ...AccountDeletionData,
  +type: 0,
};
export type ThreadUpdateData = {
  ...SharedUpdateData,
  ...ThreadData,
  +type: 1,
  +targetSession?: string,
};
export type ThreadReadStatusUpdateData = {
  ...SharedUpdateData,
  ...ThreadReadStatusData,
  +type: 2,
};
export type ThreadDeletionUpdateData = {
  ...SharedUpdateData,
  ...ThreadDeletionData,
  +type: 3,
};
export type ThreadJoinUpdateData = {
  ...SharedUpdateData,
  ...ThreadJoinData,
  +type: 4,
  +targetSession?: string,
};
export type BadDeviceTokenUpdateData = {
  ...SharedUpdateData,
  ...BadDeviceTokenData,
  +type: 5,
  +targetCookie: string,
};
export type EntryUpdateData = {
  ...SharedUpdateData,
  ...EntryData,
  +type: 6,
  +targetSession: string,
};
export type CurrentUserUpdateData = {
  ...SharedUpdateData,
  ...CurrentUserData,
  +type: 7,
};
export type UserUpdateData = {
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
export type AccountDeletionRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...AccountDeletionData,
  +type: 0,
};
export type ThreadRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadData,
  +type: 1,
};
export type ThreadReadStatusRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadReadStatusData,
  +type: 2,
};
export type ThreadDeletionRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadDeletionData,
  +type: 3,
};
export type ThreadJoinRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...ThreadJoinData,
  +type: 4,
};
export type BadDeviceTokenRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...BadDeviceTokenData,
  +type: 5,
};
export type EntryRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...EntryData,
  +type: 6,
};
export type CurrentUserRawUpdateInfo = {
  ...SharedRawUpdateInfo,
  ...CurrentUserData,
  +type: 7,
};
export type UserRawUpdateInfo = {
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

export type AccountDeletionUpdateInfo = {
  +type: 0,
  +id: string,
  +time: number,
  +deletedUserID: string,
};
export const accountDeletionUpdateInfoValidator: TInterface<AccountDeletionUpdateInfo> =
  tShape<AccountDeletionUpdateInfo>({
    type: tNumber(updateTypes.DELETE_ACCOUNT),
    id: t.String,
    time: t.Number,
    deletedUserID: t.String,
  });

export type ThreadUpdateInfo = {
  +type: 1,
  +id: string,
  +time: number,
  +threadInfo: RawThreadInfo,
};
export const threadUpdateInfoValidator: TInterface<ThreadUpdateInfo> =
  tShape<ThreadUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_THREAD),
    id: t.String,
    time: t.Number,
    threadInfo: rawThreadInfoValidator,
  });
export type ThreadReadStatusUpdateInfo = {
  +type: 2,
  +id: string,
  +time: number,
  +threadID: string,
  +unread: boolean,
};
export const threadReadStatusUpdateInfoValidator: TInterface<ThreadReadStatusUpdateInfo> =
  tShape<ThreadReadStatusUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_THREAD_READ_STATUS),
    id: t.String,
    time: t.Number,
    threadID: tID,
    unread: t.Boolean,
  });
export type ThreadDeletionUpdateInfo = {
  +type: 3,
  +id: string,
  +time: number,
  +threadID: string,
};
export const threadDeletionUpdateInfoValidator: TInterface<ThreadDeletionUpdateInfo> =
  tShape<ThreadDeletionUpdateInfo>({
    type: tNumber(updateTypes.DELETE_THREAD),
    id: t.String,
    time: t.Number,
    threadID: tID,
  });

export type ThreadJoinUpdateInfo = {
  +type: 4,
  +id: string,
  +time: number,
  +threadInfo: RawThreadInfo,
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +truncationStatus: MessageTruncationStatus,
  +rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
};
export const threadJoinUpdateInfoValidator: TInterface<ThreadJoinUpdateInfo> =
  tShape<ThreadJoinUpdateInfo>({
    type: tNumber(updateTypes.JOIN_THREAD),
    id: t.String,
    time: t.Number,
    threadInfo: rawThreadInfoValidator,
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatus: messageTruncationStatusValidator,
    rawEntryInfos: t.list(rawEntryInfoValidator),
  });
export type BadDeviceTokenUpdateInfo = {
  +type: 5,
  +id: string,
  +time: number,
  +deviceToken: string,
};
export const badDeviceTokenUpdateInfoValidator: TInterface<BadDeviceTokenUpdateInfo> =
  tShape<BadDeviceTokenUpdateInfo>({
    type: tNumber(updateTypes.BAD_DEVICE_TOKEN),
    id: t.String,
    time: t.Number,
    deviceToken: t.String,
  });
export type EntryUpdateInfo = {
  +type: 6,
  +id: string,
  +time: number,
  +entryInfo: RawEntryInfo,
};
export const entryUpdateInfoValidator: TInterface<EntryUpdateInfo> =
  tShape<EntryUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_ENTRY),
    id: t.String,
    time: t.Number,
    entryInfo: rawEntryInfoValidator,
  });
export type CurrentUserUpdateInfo = {
  +type: 7,
  +id: string,
  +time: number,
  +currentUserInfo: LoggedInUserInfo,
};
export type UserUpdateInfo = {
  +type: 8,
  +id: string,
  +time: number,
  // Updated UserInfo is already contained within the UpdatesResultWithUserInfos
  +updatedUserID: string,
};
export const userUpdateInfoValidator: TInterface<UserUpdateInfo> =
  tShape<UserUpdateInfo>({
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
  +currentUserInfo: LoggedInUserInfo,
};
export const serverCurrentUserUpdateInfoValidator: TInterface<ServerCurrentUserUpdateInfo> =
  tShape<ServerCurrentUserUpdateInfo>({
    type: tNumber(updateTypes.UPDATE_CURRENT_USER),
    id: t.String,
    time: t.Number,
    currentUserInfo: loggedInUserInfoValidator,
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
export const serverUpdateInfoValidator: TUnion<ServerUpdateInfo> = t.union([
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
export const serverUpdatesResultValidator: TInterface<ServerUpdatesResult> =
  tShape<ServerUpdatesResult>({
    currentAsOf: t.Number,
    newUpdates: t.list(serverUpdateInfoValidator),
  });

export type ServerUpdatesResultWithUserInfos = {
  +updatesResult: ServerUpdatesResult,
  +userInfos: $ReadOnlyArray<UserInfo>,
};
export const serverUpdatesResultWithUserInfosValidator: TInterface<ServerUpdatesResultWithUserInfos> =
  tShape<ServerUpdatesResultWithUserInfos>({
    updatesResult: serverUpdatesResultValidator,
    userInfos: t.list(userInfoValidator),
  });

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
  +userInfos: UserInfos,
};
export const createUpdatesResultValidator: TInterface<CreateUpdatesResult> =
  tShape<CreateUpdatesResult>({
    viewerUpdates: t.list(serverUpdateInfoValidator),
    userInfos: userInfosValidator,
  });

export type ServerCreateUpdatesResponse = {
  +viewerUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export const serverCreateUpdatesResponseValidator: TInterface<ServerCreateUpdatesResponse> =
  tShape<ServerCreateUpdatesResponse>({
    viewerUpdates: t.list(serverUpdateInfoValidator),
    userInfos: t.list(userInfoValidator),
  });

export type ClientCreateUpdatesResponse = {
  +viewerUpdates: $ReadOnlyArray<ClientUpdateInfo>,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export const processUpdatesActionType = 'PROCESS_UPDATES';
