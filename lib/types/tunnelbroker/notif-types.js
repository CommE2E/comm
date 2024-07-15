// @flow

export type TunnelbrokerAPNsNotif = {
  +type: 'APNsNotif',
  +headers: string,
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};

export type TunnelbrokerFCMNotif = {
  +type: 'FCMNotif',
  +clientMessageID: string,
  +deviceID: string,
  +data: string,
  +priority: string,
};
