// @flow

export type SessionRequestMessage = {
  +type: 'sessionRequest',
  +deviceId: string,
  +accessToken: string,
  +notifyToken?: string,
  +deviceType: 'mobile' | 'web' | 'keyserver',
  +deviceAppVersion?: string,
  +deviceOs?: string,
};
