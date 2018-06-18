// @flow

import type { RawThreadInfo } from './thread-types';

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
  UPDATE_THREAD_READ_STATUS: 2,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0 ||
      ourUpdateType === 1 ||
      ourUpdateType === 2,
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
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData
  | ThreadReadStatusUpdateData;

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
export type UpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo
  | ThreadReadStatusUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
