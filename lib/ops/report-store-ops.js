// @flow

import type { ClientReportCreationRequest } from '../types/report-types.js';

export type ReplaceQueuedReportOperation = {
  +type: 'replace_report',
  +payload: { report: ClientReportCreationRequest },
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
  +payload: { +id: string, +report: string },
};

export type ClientDBReportStoreOperation =
  | ClientDBReplaceQueuedReportOperation
  | RemoveQueuedReportsOperation
  | RemoveAllQueuedReportsOperation;

function processReportStoreOperations(
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  reportStoreOps: $ReadOnlyArray<ReportStoreOperation>,
): $ReadOnlyArray<ClientReportCreationRequest> {
  if (reportStoreOps.length === 0) {
    return queuedReports;
  }
  let processedReports = [...queuedReports];
  for (const operation of reportStoreOps) {
    if (operation.type === 'replace_report') {
      const filteredReports = processedReports.filter(
        report => report.id !== operation.payload.report.id,
      );
      processedReports = [...filteredReports, { ...operation.payload.report }];
    } else if (operation.type === 'remove_reports') {
      processedReports = processedReports.filter(
        report => !operation.payload.ids.includes(report.id),
      );
    } else if (operation.type === 'remove_all_reports') {
      processedReports = [];
    }
  }
  return processedReports;
}

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
    payload: { ids: reports.map(report => report.id ?? '') },
  };
}

export {
  processReportStoreOperations,
  convertReportsToReplaceReportOps,
  convertReportsToRemoveReportsOperation,
};
