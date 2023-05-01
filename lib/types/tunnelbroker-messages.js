// @flow

export type SessionRequestMessage = {
  +type: 'sessionRequest',
  +deviceID: string,
  +accessToken: string,
  +notifyToken?: string,
  +deviceType: 'mobile' | 'web' | 'keyserver',
};
