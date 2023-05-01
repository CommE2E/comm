// @flow

export type TBConnectionInitializationMessage = {
  +type: 'sessionRequest',
  +deviceID: string,
  +accessToken: string,
  +notifyToken?: string,
  +deviceType: 'mobile' | 'web' | 'keyserver',
};
