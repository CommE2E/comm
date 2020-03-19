// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { DeviceType } from '../types/device-types';

const setDeviceTokenActionTypes = Object.freeze({
  started: 'SET_DEVICE_TOKEN_STARTED',
  success: 'SET_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_DEVICE_TOKEN_FAILED',
});
async function setDeviceToken(
  fetchJSON: FetchJSON,
  deviceToken: string,
  deviceType: DeviceType,
): Promise<string> {
  await fetchJSON('update_device_token', { deviceType, deviceToken });
  return deviceToken;
}

export { setDeviceTokenActionTypes, setDeviceToken };
