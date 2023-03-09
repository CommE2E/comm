// @flow

import type { BaseAction } from '../types/redux-types';
import {
  type NotifPermissionAlertInfo,
  recordNotifPermissionAlertActionType,
} from '../utils/push-alerts.js';

function reduceNotifPermissionAlertInfo(
  state: NotifPermissionAlertInfo,
  action: BaseAction,
): NotifPermissionAlertInfo {
  if (action.type === recordNotifPermissionAlertActionType) {
    return {
      totalAlerts: state.totalAlerts + 1,
      lastAlertTime: action.payload.time,
    };
  }
  return state;
}

export { reduceNotifPermissionAlertInfo };
