// @flow

import type { AlertInfo } from '../types/alert-types.js';
import { DISABLE_CONNECT_FARCASTER_ALERT } from '../utils/farcaster-utils.js';

const msInDay = 24 * 60 * 60 * 1000;

function shouldSkipPushPermissionAlert(alertInfo: AlertInfo): boolean {
  return (
    (alertInfo.totalAlerts > 3 &&
      alertInfo.lastAlertTime > Date.now() - msInDay) ||
    (alertInfo.totalAlerts > 6 &&
      alertInfo.lastAlertTime > Date.now() - msInDay * 3) ||
    (alertInfo.totalAlerts > 9 &&
      alertInfo.lastAlertTime > Date.now() - msInDay * 7)
  );
}

function shouldSkipConnectFarcasterAlert(
  alertInfo: AlertInfo,
  fid: ?string,
): boolean {
  return (
    DISABLE_CONNECT_FARCASTER_ALERT ||
    fid !== undefined ||
    alertInfo.totalAlerts > 0
  );
}

function shouldSkipCreateSIWEBackupMessageAlert(alertInfo: AlertInfo): boolean {
  return alertInfo.lastAlertTime > Date.now() - msInDay;
}

export {
  shouldSkipPushPermissionAlert,
  shouldSkipConnectFarcasterAlert,
  shouldSkipCreateSIWEBackupMessageAlert,
};
