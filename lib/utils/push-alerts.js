// @flow

import type { AlertInfo } from '../types/alert-types.js';

const recordNotifPermissionAlertActionType = 'RECORD_NOTIF_PERMISSION_ALERT';

const msInDay = 24 * 60 * 60 * 1000;
const shouldSkipPushPermissionAlert = (alertInfo: AlertInfo): boolean =>
  (alertInfo.totalAlerts > 3 &&
    alertInfo.lastAlertTime > Date.now() - msInDay) ||
  (alertInfo.totalAlerts > 6 &&
    alertInfo.lastAlertTime > Date.now() - msInDay * 3) ||
  (alertInfo.totalAlerts > 9 &&
    alertInfo.lastAlertTime > Date.now() - msInDay * 7);

export { recordNotifPermissionAlertActionType, shouldSkipPushPermissionAlert };
