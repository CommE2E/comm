// @flow

import type { EnabledReports } from '../types/enabled-reports';
import type { BaseAction } from '../types/redux-types';

export const updateReportsEnabledActionType = 'UPDATE_REPORTS_ENABLED';

export default function reduceEnabledReports(
  state: EnabledReports,
  action: BaseAction,
): EnabledReports {
  if (action.type === updateReportsEnabledActionType) {
    return { ...state, ...action.payload };
  }
  return state;
}
