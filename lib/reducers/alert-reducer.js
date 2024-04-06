// @flow

import { alertTypes, type AlertStore } from '../types/alert-types.js';
import type { BaseAction } from '../types/redux-types';
import { recordNotifPermissionAlertActionType } from '../utils/push-alerts.js';

function reduceAlertStore(state: AlertStore, action: BaseAction): AlertStore {
  if (action.type === recordNotifPermissionAlertActionType) {
    return {
      ...state,
      alertInfos: {
        ...state.alertInfos,
        [alertTypes.NOTIF_PERMISSION]: {
          totalAlerts:
            state.alertInfos[alertTypes.NOTIF_PERMISSION].totalAlerts + 1,
          lastAlertTime: action.payload.time,
        },
      },
    };
  }
  return state;
}

export { reduceAlertStore };
