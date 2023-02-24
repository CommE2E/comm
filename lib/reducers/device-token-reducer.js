// @flow

import { setDeviceTokenActionTypes } from '../actions/device-actions.js';
import type { BaseAction } from '../types/redux-types';
import { incrementalStateSyncActionType } from '../types/socket-types.js';
import { updateTypes } from '../types/update-types.js';

function reduceDeviceToken(state: ?string, action: BaseAction): ?string {
  if (action.type === setDeviceTokenActionTypes.success) {
    return action.payload;
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

export { reduceDeviceToken };
