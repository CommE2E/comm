// @flow

import type { GetVersionActionPayload } from '../types/device-types';
import { getConfig } from '../utils/config.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import type {
  CallKeyserverEndpoint,
  KeyserverCallParamOverride,
} from '../utils/keyserver-call.js';

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
// useGetVersion should be passed paramOverride containing keyserverInfos
// with entries for the keyservers we want to connect to.
// They should contain the urlPrefix of the keyserver.
// The key should also be the urlPrefix,
// since the id of the keyserver is not yet known.
const getVersion =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): (() => Promise<GetVersionActionPayload>) =>
  async () => {
    const requests = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = {};
    }

    const responses = await callKeyserverEndpoint('version', requests);

    const result = { versionResponses: {} };
    for (const keyserverID in responses) {
      const { codeVersion, ownerUsername, ownerID } = responses[keyserverID];
      result.versionResponses[ownerID] = {
        codeVersion,
        ownerUsername,
        ownerID,
      };
    }

    return result;
  };

function useGetVersion(
  paramOverride?: ?KeyserverCallParamOverride,
): () => Promise<GetVersionActionPayload> {
  // const override = keyserverURL
  //   ? { urlPrefixOverride: keyserverURL }
  //   : undefined;
  // console.log(override);
  return useKeyserverCall(getVersion, paramOverride);
}

const updateLastCommunicatedPlatformDetailsActionType =
  'UPDATE_LAST_COMMUNICATED_PLATFORM_DETAILS';

export {
  setDeviceTokenActionTypes,
  useSetDeviceToken,
  useSetDeviceTokenFanout,
  getVersionActionTypes,
  useGetVersion,
  updateLastCommunicatedPlatformDetailsActionType,
};
