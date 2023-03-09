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

const msInDay = 24 * 60 * 60 * 1000;
const shouldSkipPushPermissionAlert = (
  alertInfo: NotifPermissionAlertInfo,
): boolean =>
  (alertInfo.totalAlerts > 3 &&
    alertInfo.lastAlertTime > Date.now() - msInDay) ||
  (alertInfo.totalAlerts > 6 &&
    alertInfo.lastAlertTime > Date.now() - msInDay * 3) ||
  (alertInfo.totalAlerts > 9 &&
    alertInfo.lastAlertTime > Date.now() - msInDay * 7);

export {
  defaultNotifPermissionAlertInfo,
  recordNotifPermissionAlertActionType,
  shouldSkipPushPermissionAlert,
};
