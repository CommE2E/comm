// @flow

import type { FetchJSON } from '../utils/fetch-json';

const setDeviceTokenActionTypes = {
  started: "SET_DEVICE_TOKEN_STARTED",
  success: "SET_DEVICE_TOKEN_SUCCESS",
  failed: "SET_DEVICE_TOKEN_FAILED",
};
async function setDeviceToken(
  fetchJSON: FetchJSON,
  deviceToken: string,
): Promise<string> {
  await fetchJSON('set_device_token.php', {
    'device_token': deviceToken,
  });
  return deviceToken;
}

export {
  setDeviceTokenActionTypes,
  setDeviceToken,
}
