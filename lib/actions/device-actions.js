// @flow

import type { VersionResponse } from '../types/device-types.js';
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

const getVersionActionTypes = Object.freeze({
  started: 'GET_VERSION_STARTED',
  success: 'GET_VERSION_SUCCESS',
  failed: 'GET_VERSION_FAILED',
});
const getVersion =
  (callServerEndpoint: CallServerEndpoint): (() => Promise<VersionResponse>) =>
  async () => {
    const response = await callServerEndpoint('version');
    return {
      codeVersion: response.codeVersion,
    };
  };

const updateLastCommunicatedPlatformDetailsActionType =
  'UPDATE_LAST_COMMUNICATED_PLATFORM_DETAILS';

export {
  setDeviceTokenActionTypes,
  setDeviceToken,
  getVersionActionTypes,
  getVersion,
  updateLastCommunicatedPlatformDetailsActionType,
};
