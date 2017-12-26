// @flow

import type { BaseAction } from '../types/redux-types';

import { setIOSDeviceTokenActionTypes } from '../actions/device-actions';

export default function reduceDeviceToken(
  state: ?string,
  action: BaseAction,
) {
  if (action.type === setIOSDeviceTokenActionTypes.success) {
    return action.payload;
  }
  return state;
}
