// @flow

import {
  incrementColdStartCountActionType,
  recordAlertActionType,
} from '../actions/alert-actions.js';
import type { AlertStore } from '../types/alert-types.js';
import type { BaseAction } from '../types/redux-types';

function reduceAlertStore(state: AlertStore, action: BaseAction): AlertStore {
  if (action.type === recordAlertActionType) {
    return {
      ...state,
      alertInfos: {
        ...state.alertInfos,
        [(action.payload.alertType: string)]: {
          totalAlerts:
            state.alertInfos[action.payload.alertType].totalAlerts + 1,
          lastAlertTime: action.payload.time,
        },
      },
    };
  }

  if (action.type === incrementColdStartCountActionType) {
    return {
      ...state,
      coldStartCount: state.coldStartCount + 1,
    };
  }

  return state;
}

export { reduceAlertStore };
