// @flow

import type { VersionResponse } from '../types/device-types.js';
import { getConfig } from '../utils/config.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call.js';

export type DeviceTokens = {
  +[keyserverID: string]: ?string,
};
const setDeviceTokenActionTypes = Object.freeze({
  started: 'SET_DEVICE_TOKEN_STARTED',
  success: 'SET_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_DEVICE_TOKEN_FAILED',
});
const setDeviceToken =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeviceTokens) => Promise<DeviceTokens>) =>
  async input => {
    const requests = {};
    for (const keyserverID in input) {
      requests[keyserverID] = {
        deviceToken: input[keyserverID],
        platformDetails: getConfig().platformDetails,
      };
    }
    await callKeyserverEndpoint('update_device_token', requests);
    return input;
  };

const setDeviceTokenFanout =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: ?string) => Promise<DeviceTokens>) =>
  async input => {
    const requests = {};
    const result = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = {
        deviceToken: input,
        platformDetails: getConfig().platformDetails,
      };
      result[keyserverID] = input;
    }

    await callKeyserverEndpoint('update_device_token', requests);
    return result;
  };

const TEMPORARY_KS_ID = 'TEMPORARY';
// We don't know the keyserver's id yet, so to use the CallKeyserverEndpoint
// we use a temporary keyserver id.
// To use this, pass paramOverride to useKeyserverCall,
// containing in the keyserverInfos an entry for TEMPORARY_KS_ID
const getVersionRequests = {
  [TEMPORARY_KS_ID]: {},
};

const getVersionActionTypes = Object.freeze({
  started: 'GET_VERSION_STARTED',
  success: 'GET_VERSION_SUCCESS',
  failed: 'GET_VERSION_FAILED',
});
const getVersion =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): (() => Promise<VersionResponse>) =>
  async () => {
    const response = await callKeyserverEndpoint('version', getVersionRequests);
    return {
      codeVersion: response[TEMPORARY_KS_ID].codeVersion,
      ownerUsername: response[TEMPORARY_KS_ID].ownerUsername,
      ownerID: response[TEMPORARY_KS_ID].ownerID,
    };
  };

const updateLastCommunicatedPlatformDetailsActionType =
  'UPDATE_LAST_COMMUNICATED_PLATFORM_DETAILS';

export {
  setDeviceTokenActionTypes,
  setDeviceToken,
  setDeviceTokenFanout,
  TEMPORARY_KS_ID,
  getVersionActionTypes,
  getVersion,
  updateLastCommunicatedPlatformDetailsActionType,
};
