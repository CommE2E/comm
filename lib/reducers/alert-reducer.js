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
          ...state.alertInfos[action.payload.alertType],
          totalAlerts:
            state.alertInfos[action.payload.alertType].totalAlerts + 1,
          lastAlertTime: action.payload.time,
        },
      },
    };
  } else if (action.type === incrementColdStartCountActionType) {
    const newAlertInfos = Object.fromEntries(
      Object.entries(state.alertInfos).map(([alertType, info]) => [
        alertType,
        {
          ...info,
          coldStartCount: (info.coldStartCount ?? 0) + 1,
        },
      ]),
    );

    return {
      ...state,
      alertInfos: newAlertInfos,
    };
  }

  return state;
}

export { reduceAlertStore };
