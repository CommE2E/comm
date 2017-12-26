// @flow

import type { FetchJSON } from '../utils/fetch-json';

const setIOSDeviceTokenActionTypes = {
  started: "SET_IOS_DEVICE_TOKEN_STARTED",
  success: "SET_IOS_DEVICE_TOKEN_SUCCESS",
  failed: "SET_IOS_DEVICE_TOKEN_FAILED",
};
async function setIOSDeviceToken(
  fetchJSON: FetchJSON,
  deviceToken: string,
): Promise<string> {
  await fetchJSON('set_ios_device_token.php', {
    'device_token': deviceToken,
  });
  return deviceToken;
}

export {
  setIOSDeviceTokenActionTypes,
  setIOSDeviceToken,
}
