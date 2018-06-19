// @flow

import type { RawThreadInfo } from './thread-types';

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
  UPDATE_THREAD_READ_STATUS: 2,
  DELETE_THREAD: 3,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0 ||
      ourUpdateType === 1 ||
      ourUpdateType === 2 ||
      ourUpdateType === 3,
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
  threadInfo: RawThreadInfo,
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
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData
  | ThreadReadStatusUpdateData
  | ThreadDeletionUpdateData;

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
export type UpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo
  | ThreadDeletionUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
