// @flow

import {
  deleteAccountActionTypes,
  logOutActionTypes,
} from 'lib/actions/user-actions.js';
import { setNewSessionActionType } from 'lib/utils/action-utils.js';

import { setDeviceIDActionType } from './action-types.js';
import type { Action } from '../redux/redux-setup.js';
import { deviceIDFormatRegex } from '../utils/device-id.js';

export function reduceDeviceID(state: ?string, action: Action): ?string {
  if (action.type === setDeviceIDActionType) {
    if (action.payload?.match(deviceIDFormatRegex)) {
      return action.payload;
    }
    return null;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return null;
  }
  return state;
}
