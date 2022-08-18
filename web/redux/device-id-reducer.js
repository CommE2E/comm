// @flow

import type { Action } from '../redux/redux-setup';
import { deviceIDCharLength } from '../utils//device-id';
import { setDeviceIDActionType } from './action-types';

const deviceIDRegex = new RegExp(
  `^(ks|mobile|web):[a-zA-Z0-9]{${deviceIDCharLength.toString()}}$`,
);

export function reduceDeviceID(state: ?string, action: Action): ?string {
  if (action.type === setDeviceIDActionType) {
    if (action.payload?.match(deviceIDRegex)) {
      return action.payload;
    }
    return null;
  }
  return state;
}
