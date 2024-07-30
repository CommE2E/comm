// @flow

import type { Platform } from '../device-types.js';

export const messageToTunnelbrokerTypes = Object.freeze({
  SET_DEVICE_TOKEN: 'SetDeviceToken',
  SET_DEVICE_TOKEN_WITH_PLATFORM: 'SetDeviceTokenWithPlatform',
});

export type SetDeviceToken = {
  +type: 'SetDeviceToken',
  +deviceToken: string,
};

export type SetDeviceTokenWithPlatform = {
  +type: 'SetDeviceTokenWithPlatform',
  +deviceToken: string,
  +platform: Platform,
};
