// @flow

import type { VersionResponse } from '../types/device-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';

export type DeviceTokens = {
  +[keyserverID: string]: ?string,
};
export type SetDeviceTokenActionPayload = {
  +deviceTokens: DeviceTokens,
};

const setDeviceTokenActionTypes = Object.freeze({
  started: 'SET_DEVICE_TOKEN_STARTED',
  success: 'SET_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_DEVICE_TOKEN_FAILED',
});
const setDeviceToken =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeviceTokens) => Promise<SetDeviceTokenActionPayload>) =>
  async input => {
    const requests = {};
    for (const keyserverID in input) {
      requests[keyserverID] = {
        deviceToken: input[keyserverID],
        platformDetails: getConfig().platformDetails,
      };
    }
    await callKeyserverEndpoint('update_device_token', requests);
    return { deviceTokens: input };
  };

function useSetDeviceToken(): (
  input: DeviceTokens,
) => Promise<SetDeviceTokenActionPayload> {
  return useKeyserverCall(setDeviceToken);
}

const setDeviceTokenFanout =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: ?string) => Promise<SetDeviceTokenActionPayload>) =>
  async input => {
    const requests = {};
    const deviceTokens = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = {
        deviceToken: input,
        platformDetails: getConfig().platformDetails,
      };
      deviceTokens[keyserverID] = input;
    }

    await callKeyserverEndpoint('update_device_token', requests);
    return { deviceTokens };
  };

function useSetDeviceTokenFanout(): (
  input: ?string,
) => Promise<SetDeviceTokenActionPayload> {
  return useKeyserverCall(setDeviceTokenFanout);
}

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
  useSetDeviceToken,
  useSetDeviceTokenFanout,
  getVersionActionTypes,
  getVersion,
  updateLastCommunicatedPlatformDetailsActionType,
};
