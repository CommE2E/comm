// @flow

export type NotifPermissionAlertInfo = {
  +totalAlerts: number,
  +lastAlertTime: number,
};

const defaultNotifPermissionAlertInfo: NotifPermissionAlertInfo = {
  totalAlerts: 0,
  lastAlertTime: 0,
};

const recordNotifPermissionAlertActionType = 'RECORD_NOTIF_PERMISSION_ALERT';

export {
  defaultNotifPermissionAlertInfo,
  recordNotifPermissionAlertActionType,
};
