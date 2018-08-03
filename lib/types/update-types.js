// @flow

import type { RawThreadInfo } from './thread-types';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from './message-types';
import type { RawEntryInfo, CalendarQuery } from './entry-types';

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
  UPDATE_THREAD_READ_STATUS: 2,
  DELETE_THREAD: 3,
  JOIN_THREAD: 4,
  BAD_DEVICE_TOKEN: 5,
  UPDATE_ENTRY: 6,
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
      ourUpdateType === 6,
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
  targetCookie: string,
|};
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData
  | ThreadReadStatusUpdateData
  | ThreadDeletionUpdateData
  | ThreadJoinUpdateData
  | BadDeviceTokenUpdateData
  | EntryUpdateData;

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
export type UpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo
  | ThreadDeletionUpdateInfo
  | ThreadJoinUpdateInfo
  | BadDeviceTokenUpdateInfo
  | EntryUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
