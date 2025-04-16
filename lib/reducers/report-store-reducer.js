// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  sendReportActionTypes,
  sendReportsActionTypes,
  queueReportsActionType,
} from '../actions/report-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
  legacyLogInActionTypes,
} from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { ReportStoreOperation } from '../ops/report-store-ops.js';
import {
  convertReportsToRemoveReportsOperation,
  convertReportsToReplaceReportOps,
  reportStoreOpsHandlers,
} from '../ops/report-store-ops.js';
import { isStaff } from '../shared/staff-utils.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  type ReportStore,
  defaultEnabledReports,
  defaultDevEnabledReports,
  type ClientReportCreationRequest,
} from '../types/report-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { isDev } from '../utils/dev-utils.js';
import { isReportEnabled } from '../utils/report-utils.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

export const updateReportsEnabledActionType = 'UPDATE_REPORTS_ENABLED';

const { processStoreOperations: processReportStoreOperations } =
  reportStoreOpsHandlers;

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
    action.type === deleteAccountActionTypes.success
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
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
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
  } else if (action.type === legacyLogInActionTypes.success) {
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
    action.type === sendReportActionTypes.success ||
    action.type === sendReportsActionTypes.success
  ) {
    const { payload } = action;
    if (payload) {
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
    }
  } else if (action.type === queueReportsActionType) {
    const { reports } = action.payload;
    const filteredReports = reports.filter(report =>
      isReportEnabled(report, state.enabledReports),
    );

    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> =
      convertReportsToReplaceReportOps([...newReports, ...filteredReports]);

    const queuedReports = processReportStoreOperations(
      state.queuedReports,
      reportStoreOperations,
    );

    return {
      reportStore: {
        ...state,
        queuedReports,
      },
      reportStoreOperations,
    };
  } else if (action.type === setClientDBStoreActionType) {
    const { reports } = action.payload;
    if (!reports) {
      return {
        reportStore: state,
        reportStoreOperations: [],
      };
    }
    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> = [
      {
        type: 'remove_all_reports',
      },
      ...convertReportsToReplaceReportOps(reports),
    ];

    const queuedReports = processReportStoreOperations(
      state.queuedReports,
      reportStoreOperations,
    );

    return {
      reportStore: { ...state, queuedReports },
      reportStoreOperations: [],
    };
  }

  if (newReports.length > 0) {
    const reportStoreOperations: $ReadOnlyArray<ReportStoreOperation> =
      convertReportsToReplaceReportOps(newReports);

    const queuedReports = processReportStoreOperations(
      state.queuedReports,
      reportStoreOperations,
    );

    return {
      reportStore: {
        ...state,
        queuedReports,
      },
      reportStoreOperations,
    };
  }

  return { reportStore: state, reportStoreOperations: [] };
}
