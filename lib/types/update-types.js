// @flow

import type { RawThreadInfo } from './thread-types';

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
  UPDATE_THREAD: 1,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0 ||
      ourUpdateType === 1,
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
export type UpdateData =
  | AccountDeletionUpdateData
  | ThreadUpdateData;

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
export type UpdateInfo =
  | AccountDeletionUpdateInfo
  | ThreadUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
