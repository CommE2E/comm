// @flow

export type MessageToDeviceRequest = {
  +type: 'MessageToDeviceRequest',
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};
