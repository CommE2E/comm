// @flow

import { setDeviceTokenActionTypes } from 'lib/actions/device-actions.js';
import {
  deleteAccountActionTypes,
  logOutActionTypes,
} from 'lib/actions/user-actions.js';
import { incrementalStateSyncActionType } from 'lib/types/socket-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import type { Action } from '../redux/redux-setup.js';

export function reduceDeviceToken(state: ?string, action: Action): ?string {
  if (action.type === setDeviceTokenActionTypes.success) {
    return action.payload;
  }
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return null;
  }
  if (action.type === incrementalStateSyncActionType) {
    for (const update of action.payload.updatesResult.newUpdates) {
      if (
        update.type === updateTypes.BAD_DEVICE_TOKEN &&
        update.deviceToken === state
      ) {
        return null;
      }
    }
  }

  return state;
}
