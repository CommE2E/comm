// @flow

export type TunnelbrokerAPNsNotif = {
  +type: 'APNsNotif',
  +headers: string,
  +clientMessageID: string,
  +deviceID: string,
  +payload: string,
};
