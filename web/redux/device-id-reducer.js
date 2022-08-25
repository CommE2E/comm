// @flow

import type { Action } from '../redux/redux-setup';
import { deviceIDFormatRegex } from '../utils/device-id';
import { setDeviceIDActionType } from './action-types';

export function reduceDeviceID(state: ?string, action: Action): ?string {
  if (action.type === setDeviceIDActionType) {
    if (action.payload?.match(deviceIDFormatRegex)) {
      return action.payload;
    }
    return null;
  }
  return state;
}
