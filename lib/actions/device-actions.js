// @flow

import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';

const setDeviceTokenActionTypes = Object.freeze({
  started: 'SET_DEVICE_TOKEN_STARTED',
  success: 'SET_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_DEVICE_TOKEN_FAILED',
});
const setDeviceToken =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((deviceToken: ?string) => Promise<?string>) =>
  async deviceToken => {
    await callServerEndpoint('update_device_token', {
      deviceToken,
      platformDetails: getConfig().platformDetails,
    });
    return deviceToken;
  };

export { setDeviceTokenActionTypes, setDeviceToken };
