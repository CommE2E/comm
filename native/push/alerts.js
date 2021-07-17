// @flow

export type NotifPermissionAlertInfo = {
  +totalAlerts: number,
  +lastAlertTime: number,
};

const defaultNotifPermissionAlertInfo: NotifPermissionAlertInfo = {
  totalAlerts: 0,
  lastAlertTime: 0,
};

export { defaultNotifPermissionAlertInfo };
