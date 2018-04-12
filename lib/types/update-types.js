// @flow

import invariant from 'invariant';

export const updateTypes = Object.freeze({
  DELETE_ACCOUNT: 0,
});
export type UpdateType = $Values<typeof updateTypes>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0,
    "number is not UpdateType enum",
  );
  return ourUpdateType;
}

export type AccountDeletionUpdateData = {|
  type: 0,
  userID: string,
  time: number,
  deletedUserID: string,
|};
export type UpdateData = AccountDeletionUpdateData;

export type AccountDeletionUpdateInfo = {|
  type: 0,
  id: string,
  time: number,
  deletedUserID: string,
|};
export type UpdateInfo = AccountDeletionUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
