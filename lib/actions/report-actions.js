// @flow

import type {
  ClientReportCreationRequest,
  ReportCreationResponse,
} from '../types/report-types';
import type { FetchJSON } from '../utils/fetch-json';

const sendReportActionTypes = Object.freeze({
  started: 'SEND_REPORT_STARTED',
  success: 'SEND_REPORT_SUCCESS',
  failed: 'SEND_REPORT_FAILED',
});
const fetchJSONOptions = { timeout: 60000 };
const sendReport = (fetchJSON: FetchJSON): (
  request: ClientReportCreationRequest,
) => Promise<ReportCreationResponse> => async (
  request,
) => {
  const response = await fetchJSON('create_report', request, fetchJSONOptions);
  return { id: response.id };
};

const sendReportsActionTypes = Object.freeze({
  started: 'SEND_REPORTS_STARTED',
  success: 'SEND_REPORTS_SUCCESS',
  failed: 'SEND_REPORTS_FAILED',
});
const sendReports = (fetchJSON: FetchJSON): (
  reports: $ReadOnlyArray<ClientReportCreationRequest>,
) => Promise<void> => async (
  reports,
) => {
  await fetchJSON('create_reports', { reports }, fetchJSONOptions);
};

const queueReportsActionType = 'QUEUE_REPORTS';

export {
  sendReportActionTypes,
  sendReport,
  sendReportsActionTypes,
  sendReports,
  queueReportsActionType,
};
