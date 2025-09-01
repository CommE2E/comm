// @flow

import { isDev } from './dev-utils.js';
import { DISABLE_CONNECT_FARCASTER_ALERT } from './farcaster-utils.js';
import type { AlertInfo } from '../types/alert-types.js';

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
  // The isDev check is here so that devs don't get continually spammed
  // with this alert.
  return (
    isDev ||
    DISABLE_CONNECT_FARCASTER_ALERT ||
    fid === null ||
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
