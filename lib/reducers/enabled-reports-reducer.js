// @flow

import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
} from '../actions/user-actions';
import { isStaff } from '../shared/user-utils';
import type { BaseAction } from '../types/redux-types';
import {
  type EnabledReports,
  defaultEnabledReports,
  defaultDevEnabledReports,
} from '../types/report-types';
import { setNewSessionActionType } from '../utils/action-utils';
import { isDev } from '../utils/dev-utils';

export const updateReportsEnabledActionType = 'UPDATE_REPORTS_ENABLED';

export default function reduceEnabledReports(
  state: EnabledReports,
  action: BaseAction,
): EnabledReports {
  if (action.type === updateReportsEnabledActionType) {
    return { ...state, ...action.payload };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return isDev ? defaultDevEnabledReports : defaultEnabledReports;
  } else if (action.type === logInActionTypes.success) {
    return isStaff(action.payload.currentUserInfo.id) || isDev
      ? defaultDevEnabledReports
      : defaultEnabledReports;
  }
  return state;
}
