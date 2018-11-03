// @flow

import type { RawThreadInfo } from './thread-types';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from './message-types';
import type { RawEntryInfo } from './entry-types';
import type { AccountUserInfo, LoggedInUserInfo } from './user-types';

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
  UPDATE_THREAD_READ_STATUS: 2,
  DELETE_THREAD: 3,
  JOIN_THREAD: 4,
  BAD_DEVICE_TOKEN: 5,
  UPDATE_ENTRY: 6,
  UPDATE_CURRENT_USER: 7,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0 ||
      ourUpdateType === 1 ||
      ourUpdateType === 2 ||
      ourUpdateType === 3 ||
      ourUpdateType === 4 ||
      ourUpdateType === 5 ||
      ourUpdateType === 6 ||
      ourUpdateType === 7,
    "number is not UpdateType enum",
  );
  return ourUpdateType;
}

type AccountDeletionUpdateData = {|
  type: 0,
  userID: string,
  time: number,
  deletedUserID: string,
|};
type ThreadUpdateData = {|
  type: 1,
  userID: string,
  time: number,
  threadID: string,
|};
type ThreadReadStatusUpdateData = {|
  type: 2,
  userID: string,
  time: number,
  threadID: string,
  unread: bool,
|};
type ThreadDeletionUpdateData = {|
  type: 3,
  userID: string,
  time: number,
  threadID: string,
|};
type ThreadJoinUpdateData = {|
  type: 4,
  userID: string,
  time: number,
  threadID: string,
|};
type BadDeviceTokenUpdateData = {|
  type: 5,
  userID: string,
  time: number,
  deviceToken: string,
  targetCookie: string,
|};
type EntryUpdateData = {|
  type: 6,
  userID: string,
  time: number,
  entryID: string,
  targetSession: string,
|};
type CurrentUserUpdateData = {|
  type: 7,
  userID: string,
  time: number,
|};
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData
  | ThreadReadStatusUpdateData
  | ThreadDeletionUpdateData
  | ThreadJoinUpdateData
  | BadDeviceTokenUpdateData
  | EntryUpdateData
  | CurrentUserUpdateData;

type AccountDeletionRawUpdateInfo = {|
  type: 0,
  id: string,
  time: number,
  deletedUserID: string,
|};
type ThreadRawUpdateInfo = {|
  type: 1,
  id: string,
  time: number,
  threadID: string,
|};
type ThreadReadStatusRawUpdateInfo = {|
  type: 2,
  id: string,
  time: number,
  threadID: string,
  unread: bool,
|};
type ThreadDeletionRawUpdateInfo = {|
  type: 3,
  id: string,
  time: number,
  threadID: string,
|};
type ThreadJoinRawUpdateInfo = {|
  type: 4,
  id: string,
  time: number,
  threadID: string,
|};
type BadDeviceTokenRawUpdateInfo = {|
  type: 5,
  id: string,
  time: number,
  deviceToken: string,
|};
type EntryRawUpdateInfo = {|
  type: 6,
  id: string,
  time: number,
  entryID: string,
|};
type CurrentUserRawUpdateInfo = {|
  type: 7,
  id: string,
  time: number,
|};
export type RawUpdateInfo =
  | AccountDeletionRawUpdateInfo
  | ThreadRawUpdateInfo
  | ThreadReadStatusRawUpdateInfo
  | ThreadDeletionRawUpdateInfo
  | ThreadJoinRawUpdateInfo
  | BadDeviceTokenRawUpdateInfo
  | EntryRawUpdateInfo
  | CurrentUserRawUpdateInfo;

type AccountDeletionUpdateInfo = {|
  type: 0,
  id: string,
  time: number,
  deletedUserID: string,
|};
type ThreadUpdateInfo = {|
  type: 1,
  id: string,
  time: number,
  threadInfo: RawThreadInfo,
|};
type ThreadReadStatusUpdateInfo = {|
  type: 2,
  id: string,
  time: number,
  threadID: string,
  unread: bool,
|};
type ThreadDeletionUpdateInfo = {|
  type: 3,
  id: string,
  time: number,
  threadID: string,
|};
type ThreadJoinUpdateInfo = {|
  type: 4,
  id: string,
  time: number,
  threadInfo: RawThreadInfo,
  rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  truncationStatus: MessageTruncationStatus,
  rawEntryInfos: $ReadOnlyArray<RawEntryInfo>,
|};
type BadDeviceTokenUpdateInfo = {|
  type: 5,
  id: string,
  time: number,
  deviceToken: string,
|};
type EntryUpdateInfo = {|
  type: 6,
  id: string,
  time: number,
  entryInfo: RawEntryInfo,
|};
type CurrentUserUpdateInfo = {|
  type: 7,
  id: string,
  time: number,
  currentUserInfo: LoggedInUserInfo,
|};
export type UpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo
  | ThreadDeletionUpdateInfo
  | ThreadJoinUpdateInfo
  | BadDeviceTokenUpdateInfo
  | EntryUpdateInfo
  | CurrentUserUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};

export type CreateUpdatesResult = {|
  viewerUpdates: $ReadOnlyArray<UpdateInfo>,
  userInfos: {[id: string]: AccountUserInfo},
|};

export type CreateUpdatesResponse = {|
  viewerUpdates: $ReadOnlyArray<UpdateInfo>,
  userInfos: $ReadOnlyArray<AccountUserInfo>,
|};
