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
import type { ReportStoreOperation } from '../ops/report-store-ops.js';
import {
  convertReportsToRemoveReportsOperation,
  convertReportsToReplaceReportOps,
  processReportStoreOperations,
} from '../ops/report-store-ops.js';
import { isStaff } from '../shared/staff-utils.js';
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
): {
  reportStore: ReportStore,
  reportStoreOperations: $ReadOnlyArray<ReportStoreOperation>,
} {
  const newReports = newInconsistencies.filter(report =>
    isReportEnabled(report, state.enabledReports),
  );

  const updatedReports =
    newInconsistencies.length > 0
      ? [...state.queuedReports, ...newInconsistencies].filter(report =>
          isReportEnabled(report, state.enabledReports),
        )
      : state.queuedReports;

  if (action.type === updateReportsEnabledActionType) {
    const newEnabledReports = { ...state.enabledReports, ...action.payload };
    const newFilteredReports = newReports.filter(report =>
      isReportEnabled(report, newEnabledReports),
    );
    const reportsToRemove = state.queuedReports.filter(
      report => !isReportEnabled(report, newEnabledReports),
    );

    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> = [
      convertReportsToRemoveReportsOperation(reportsToRemove),
      ...convertReportsToReplaceReportOps(newFilteredReports),
    ];

    const queuedReports = processReportStoreOperations(
      state.queuedReports,
      reportStoreOperations,
    );

    return {
      reportStore: {
        queuedReports,
        enabledReports: newEnabledReports,
      },
      reportStoreOperations,
    };
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {
      reportStore: {
        queuedReports: [],
        enabledReports: isDev
          ? defaultDevEnabledReports
          : defaultEnabledReports,
      },
      reportStoreOperations: [{ type: 'remove_all_reports' }],
    };
  } else if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success
  ) {
    return {
      reportStore: {
        queuedReports: [],
        enabledReports:
          isStaff(action.payload.currentUserInfo.id) || isDev
            ? defaultDevEnabledReports
            : defaultEnabledReports,
      },
      reportStoreOperations: [{ type: 'remove_all_reports' }],
    };
  } else if (
    (action.type === sendReportActionTypes.success ||
      action.type === sendReportsActionTypes.success) &&
    action.payload
  ) {
    const { payload } = action;
    const sentReports = state.queuedReports.filter(response =>
      payload.reports.includes(response),
    );

    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> = [
      convertReportsToRemoveReportsOperation(sentReports),
      ...convertReportsToReplaceReportOps(newReports),
    ];

    const queuedReports = processReportStoreOperations(
      state.queuedReports,
      reportStoreOperations,
    );

    return {
      reportStore: { ...state, queuedReports },
      reportStoreOperations,
    };
  } else if (action.type === queueReportsActionType) {
    const { reports } = action.payload;
    const filteredReports = [...updatedReports, ...reports].filter(report =>
      isReportEnabled(report, state.enabledReports),
    );
    return {
      reportStore: {
        ...state,
        queuedReports: filteredReports,
      },
      reportStoreOperations: [],
    };
  }
  const reportStore =
    updatedReports !== state.queuedReports
      ? { ...state, queuedReports: updatedReports }
      : state;

  return { reportStore, reportStoreOperations: [] };
}
