// @flow

export type TunnelbrokerDeviceTypes = 'mobile' | 'web' | 'keyserver';

export type ConnectionInitializationMessage = {
  +type: 'ConnectionInitializationMessage',
  +deviceID: string,
  +accessToken: string,
  +userID: string,
  +notifyToken?: ?string,
  +deviceType: TunnelbrokerDeviceTypes,
  +deviceAppVersion?: ?string,
  +deviceOS?: ?string,
};

export type AnonymousInitializationMessage = {
  +type: 'AnonymousInitializationMessage',
  +deviceID: string,
  +deviceType: TunnelbrokerDeviceTypes,
  +deviceAppVersion?: ?string,
  +deviceOS?: ?string,
};

export type TunnelbrokerInitializationMessage =
  | ConnectionInitializationMessage
  | AnonymousInitializationMessage;
