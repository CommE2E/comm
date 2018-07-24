// @flow

import type { BaseAction } from '../types/redux-types';
import { updateTypes } from '../types/update-types';

import { setDeviceTokenActionTypes } from '../actions/device-actions';
import { pingActionTypes } from '../actions/ping-actions';

export default function reduceDeviceToken(
  state: ?string,
  action: BaseAction,
) {
  if (action.type === setDeviceTokenActionTypes.started) {
    return action.payload;
  } else if (action.type === pingActionTypes.success) {
    if (action.payload.updatesResult) {
      for (let update of action.payload.updatesResult.newUpdates) {
        if (
          update.type === updateTypes.BAD_DEVICE_TOKEN &&
          update.deviceToken === state
        ) {
          return null;
        }
      }
    }
  }
  return state;
}
