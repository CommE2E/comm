// @flow

import type {
  ClientReportCreationRequest,
  ReportCreationResponse,
} from '../types/report-types.js';
import { sendReports as callSendReports } from '../utils/reports-service.js';

const sendReportActionTypes = Object.freeze({
  started: 'SEND_REPORT_STARTED',
  success: 'SEND_REPORT_SUCCESS',
  failed: 'SEND_REPORT_FAILED',
});
const sendReport: (
  request: ClientReportCreationRequest,
) => Promise<ReportCreationResponse> = async request => {
  const {
    reportIDs: [id],
  } = await callSendReports([request]);

  if (!id) {
    throw new Error('Server did not return report ID');
  }
  return { id };
};

const sendReportsActionTypes = Object.freeze({
  started: 'SEND_REPORTS_STARTED',
  success: 'SEND_REPORTS_SUCCESS',
  failed: 'SEND_REPORTS_FAILED',
});
const sendReports: (
  clientReports: $ReadOnlyArray<ClientReportCreationRequest>,
) => Promise<void> = async clientReports => {
  await callSendReports(clientReports);
};

const queueReportsActionType = 'QUEUE_REPORTS';

export {
  sendReportActionTypes,
  sendReport,
  sendReportsActionTypes,
  sendReports,
  queueReportsActionType,
};
