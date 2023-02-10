// @flow

import {
  sendReportActionTypes,
  sendReportsActionTypes,
  queueReportsActionType,
} from '../actions/report-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  logInActionTypes,
} from '../actions/user-actions.js';
import { isStaff } from '../shared/user-utils.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  type ReportStore,
  defaultEnabledReports,
  defaultDevEnabledReports,
  type ClientReportCreationRequest,
} from '../types/report-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';
import { isDev } from '../utils/dev-utils.js';
import { isReportEnabled } from '../utils/report-utils.js';

export const updateReportsEnabledActionType = 'UPDATE_REPORTS_ENABLED';

export default function reduceReportStore(
  state: ReportStore,
  action: BaseAction,
  newInconsistencies: $ReadOnlyArray<ClientReportCreationRequest>,
): ReportStore {
  const updatedReports =
    newInconsistencies.length > 0
      ? [...state.queuedReports, ...newInconsistencies].filter(report =>
          isReportEnabled(report, state.enabledReports),
        )
      : state.queuedReports;

  if (action.type === updateReportsEnabledActionType) {
    const newEnabledReports = { ...state.enabledReports, ...action.payload };
    const filteredReports = updatedReports.filter(report =>
      isReportEnabled(report, newEnabledReports),
    );
    return {
      queuedReports: filteredReports,
      enabledReports: newEnabledReports,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {
      queuedReports: [],
      enabledReports: isDev ? defaultDevEnabledReports : defaultEnabledReports,
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    return {
      queuedReports: [],
      enabledReports:
        isStaff(action.payload.currentUserInfo.id) || isDev
          ? defaultDevEnabledReports
          : defaultEnabledReports,
    };
  } else if (
    (action.type === sendReportActionTypes.success ||
      action.type === sendReportsActionTypes.success) &&
    action.payload
  ) {
    const { payload } = action;
    const unsentReports = updatedReports.filter(
      response => !payload.reports.includes(response),
    );
    if (unsentReports.length === updatedReports.length) {
      return state;
    }
    return { ...state, queuedReports: unsentReports };
  } else if (action.type === queueReportsActionType) {
    const { reports } = action.payload;
    const filteredReports = [...updatedReports, ...reports].filter(report =>
      isReportEnabled(report, state.enabledReports),
    );
    return {
      ...state,
      queuedReports: filteredReports,
    };
  }
  return updatedReports !== state.queuedReports
    ? { ...state, queuedReports: updatedReports }
    : state;
}
