// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  ClientReportCreationRequest,
  ReportCreationResponse,
} from '../types/report-types';

const sendReportActionTypes = Object.freeze({
  started: 'SEND_REPORT_STARTED',
  success: 'SEND_REPORT_SUCCESS',
  failed: 'SEND_REPORT_FAILED',
});
const fetchJSONOptions = { timeout: 60000 };
async function sendReport(
  fetchJSON: FetchJSON,
  request: ClientReportCreationRequest,
): Promise<ReportCreationResponse> {
  const response = await fetchJSON('create_report', request, fetchJSONOptions);
  return { id: response.id };
}

const sendReportsActionTypes = Object.freeze({
  started: 'SEND_REPORTS_STARTED',
  success: 'SEND_REPORTS_SUCCESS',
  failed: 'SEND_REPORTS_FAILED',
});
async function sendReports(
  fetchJSON: FetchJSON,
  reports: $ReadOnlyArray<ClientReportCreationRequest>,
): Promise<void> {
  await fetchJSON('create_reports', { reports }, fetchJSONOptions);
}

const queueReportsActionType = 'QUEUE_REPORTS';

export {
  sendReportActionTypes,
  sendReport,
  sendReportsActionTypes,
  sendReports,
  queueReportsActionType,
};
