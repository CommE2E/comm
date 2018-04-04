// @flow

import invariant from 'invariant';

export const updateType = Object.freeze({
  DELETE_ACCOUNT: 0,
});
export type UpdateType = $Values<typeof updateType>;
export function assertUpdateType(
  ourUpdateType: number,
): UpdateType {
  invariant(
    ourUpdateType === 0,
    "number is not UpdateType enum",
  );
  return ourUpdateType;
}

export type DeleteAccountUpdateInfo = {|
  type: 0,
  id: string,
  time: number,
  deletedUserID: string,
|};
export type UpdateInfo = DeleteAccountUpdateInfo;

export type UpdatesResult = {|
  currentAsOf: number,
  newUpdates: $ReadOnlyArray<UpdateInfo>,
|};
