// @flow

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

const GATE_CONNECT_FARCASTER_ALERT = true;

function shouldSkipConnectFarcasterAlert(alertInfo: AlertInfo): boolean {
  return (
    GATE_CONNECT_FARCASTER_ALERT ||
    alertInfo.lastAlertTime > Date.now() - msInDay
  );
}

export { shouldSkipPushPermissionAlert, shouldSkipConnectFarcasterAlert };
