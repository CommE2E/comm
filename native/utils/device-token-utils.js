// @flow

import type { DeviceTokenUpdateRequest } from 'lib/types/device-types';

import { Platform } from 'react-native';

function getDeviceTokenUpdateRequest(
  deviceToken: ?string,
): ?DeviceTokenUpdateRequest {
  if (!deviceToken) {
    return null;
  }
  return {
    deviceType: Platform.OS,
    deviceToken,
  };
}

export {
  getDeviceTokenUpdateRequest,
};
