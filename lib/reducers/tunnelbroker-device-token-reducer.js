// @flow

import {
  setDeviceTokenActionTypes,
  type SetDeviceTokenStartedPayload,
} from '../actions/device-actions.js';
import { setTBDeviceTokenActionTypes } from '../actions/tunnelbroker-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import type { TunnelbrokerDeviceToken } from '../types/tunnelbroker-device-token-types.js';

function reduceTunnelbrokerDeviceToken(
  state: TunnelbrokerDeviceToken,
  action: BaseAction,
): TunnelbrokerDeviceToken {
  if (action.type === setDeviceTokenActionTypes.started) {
    const payload: SetDeviceTokenStartedPayload = action.payload;
    if (payload.type === 'nothing_to_set') {
      return state;
    }
    if (payload.type === 'clear_device_token') {
      return { ...state, localToken: null };
    }
    return { ...state, localToken: payload.deviceToken };
  } else if (action.type === setTBDeviceTokenActionTypes.success) {
    const { deviceToken } = action.payload;
    return { ...state, tunnelbrokerToken: deviceToken };
  }

  return state;
}

export default reduceTunnelbrokerDeviceToken;
