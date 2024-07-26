// @flow

const setTBDeviceTokenActionTypes = Object.freeze({
  started: 'SET_TB_DEVICE_TOKEN_STARTED',
  success: 'SET_TB_DEVICE_TOKEN_SUCCESS',
  failed: 'SET_TB_DEVICE_TOKEN_FAILED',
});

export const invalidateTunnelbrokerDeviceToken =
  'INVALIDATE_TUNNELBROKER_DEVICE_TOKEN';

export { setTBDeviceTokenActionTypes };
