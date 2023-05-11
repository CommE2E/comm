// @flow

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
