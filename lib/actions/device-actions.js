// @flow

import { getConfig } from '../utils/config';
import type { FetchJSON } from '../utils/fetch-json';

const setDeviceTokenActionTypes = Object.freeze({
  started: 'SET_DEVICE_TOKEN_STARTED',
  success: 'SET_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_DEVICE_TOKEN_FAILED',
});
const setDeviceToken = (fetchJSON: FetchJSON): (deviceToken: string) => Promise<string> => async (
  deviceToken
) => {
  await fetchJSON('update_device_token', {
    deviceToken,
    platformDetails: getConfig().platformDetails,
  });
  return deviceToken;
};

export { setDeviceTokenActionTypes, setDeviceToken };
