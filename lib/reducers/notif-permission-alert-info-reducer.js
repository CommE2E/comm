// @flow

import type { AlertInfo } from '../types/alert-types.js';
import type { BaseAction } from '../types/redux-types';
import { recordNotifPermissionAlertActionType } from '../utils/push-alerts.js';

function reduceNotifPermissionAlertInfo(
  state: AlertInfo,
  action: BaseAction,
): AlertInfo {
  if (action.type === recordNotifPermissionAlertActionType) {
    return {
      totalAlerts: state.totalAlerts + 1,
      lastAlertTime: action.payload.time,
    };
  }
  return state;
}

export { reduceNotifPermissionAlertInfo };
