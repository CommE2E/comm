// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { ClientReportCreationRequest } from '../types/report-types.js';

export type ReplaceQueuedReportOperation = {
  +type: 'replace_report',
  +payload: { +report: ClientReportCreationRequest },
};

export type RemoveQueuedReportsOperation = {
  +type: 'remove_reports',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllQueuedReportsOperation = {
  +type: 'remove_all_reports',
};

export type ReportStoreOperation =
  | ReplaceQueuedReportOperation
  | RemoveQueuedReportsOperation
  | RemoveAllQueuedReportsOperation;

export type ClientDBReplaceQueuedReportOperation = {
  +type: 'replace_report',
  +payload: ClientDBReport,
};

export type ClientDBReportStoreOperation =
  | ClientDBReplaceQueuedReportOperation
  | RemoveQueuedReportsOperation
  | RemoveAllQueuedReportsOperation;

export type ClientDBReport = { +id: string, +report: string };

function convertReportsToReplaceReportOps(
  reports: $ReadOnlyArray<ClientReportCreationRequest>,
): $ReadOnlyArray<ReplaceQueuedReportOperation> {
  return reports.map(report => ({
    type: 'replace_report',
    payload: { report },
  }));
}

function convertReportsToRemoveReportsOperation(
  reports: $ReadOnlyArray<ClientReportCreationRequest>,
): RemoveQueuedReportsOperation {
  return {
    type: 'remove_reports',
    payload: { ids: reports.map(report => report.id) },
  };
}

export const reportStoreOpsHandlers: BaseStoreOpsHandlers<
  $ReadOnlyArray<ClientReportCreationRequest>,
  ReportStoreOperation,
  ClientDBReportStoreOperation,
  $ReadOnlyArray<ClientReportCreationRequest>,
  ClientDBReport,
> = {
  processStoreOperations(
    queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
    ops: $ReadOnlyArray<ReportStoreOperation>,
  ): $ReadOnlyArray<ClientReportCreationRequest> {
    if (ops.length === 0) {
      return queuedReports;
    }
    let processedReports = [...queuedReports];
    for (const operation of ops) {
      if (operation.type === 'replace_report') {
        const filteredReports = processedReports.filter(
          report => report.id !== operation.payload.report.id,
        );
        processedReports = [
          ...filteredReports,
          { ...operation.payload.report },
        ];
      } else if (operation.type === 'remove_reports') {
        processedReports = processedReports.filter(
          report => !operation.payload.ids.includes(report.id),
        );
      } else if (operation.type === 'remove_all_reports') {
        processedReports = [];
      }
    }
    return processedReports;
  },

  convertOpsToClientDBOps(
    ops: $ReadOnlyArray<ReportStoreOperation>,
  ): $ReadOnlyArray<ClientDBReportStoreOperation> {
    return ops.map(operation => {
      if (
        operation.type === 'remove_reports' ||
        operation.type === 'remove_all_reports'
      ) {
        return operation;
      }
      return {
        type: 'replace_report',
        payload: {
          id: operation.payload.report.id,
          report: JSON.stringify(operation.payload.report),
        },
      };
    });
  },
  translateClientDBData(
    data: $ReadOnlyArray<ClientDBReport>,
  ): $ReadOnlyArray<ClientReportCreationRequest> {
    return data.map(reportRecord => JSON.parse(reportRecord.report));
  },
};

export {
  convertReportsToReplaceReportOps,
  convertReportsToRemoveReportsOperation,
};
