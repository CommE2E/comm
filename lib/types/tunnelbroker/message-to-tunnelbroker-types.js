// @flow

export const messageToTunnelbrokerTypes = Object.freeze({
  SET_DEVICE_TOKEN: 'SetDeviceToken',
});

export type SetDeviceToken = {
  +type: 'SetDeviceToken',
  +deviceToken: string,
};
