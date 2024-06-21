// @flow

import { setDeviceTokenActionTypes } from '../actions/device-actions.js';
import { setTBDeviceTokenActionTypes } from '../actions/tunnelbroker-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import type { TunnelbrokerDeviceToken } from '../types/tunnelbroker-device-token-types.js';

function reduceTunnelbrokerDeviceToken(
  state: TunnelbrokerDeviceToken,
  action: BaseAction,
): TunnelbrokerDeviceToken {
  if (action.type === setDeviceTokenActionTypes.started) {
    if (!action.payload) {
      return state;
    }
    const { deviceToken } = action.payload;
    return { ...state, localToken: deviceToken };
  } else if (action.type === setTBDeviceTokenActionTypes.success) {
    const { deviceToken } = action.payload;
    return { ...state, tunnelbrokerToken: deviceToken };
  }

  return state;
}

export default reduceTunnelbrokerDeviceToken;
