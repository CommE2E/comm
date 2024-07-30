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
  +priority: 'NORMAL' | 'HIGH',
};

export type TunnelbrokerWebPushNotif = {
  +type: 'WebPushNotif',
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};

export type TunnelbrokerWNSNotif = {
  +type: 'WNSNotif',
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};

export type TunnelbrokerNotif =
  | TunnelbrokerAPNsNotif
  | TunnelbrokerFCMNotif
  | TunnelbrokerWebPushNotif
  | TunnelbrokerWNSNotif;
