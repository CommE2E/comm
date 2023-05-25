// @flow

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
    payload: { ids: reports.map(report => report.id) },
  };
}

function convertReportStoreOperationToClientDBReportStoreOperation(
  reportStoreOperations: $ReadOnlyArray<ReportStoreOperation>,
): $ReadOnlyArray<ClientDBReportStoreOperation> {
  return reportStoreOperations.map(operation => {
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
}

export {
  processReportStoreOperations,
  convertReportsToReplaceReportOps,
  convertReportsToRemoveReportsOperation,
  convertReportStoreOperationToClientDBReportStoreOperation,
};
