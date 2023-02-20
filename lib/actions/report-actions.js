// @flow

import type {
  ClientReportCreationRequest,
  ReportCreationResponse,
} from '../types/report-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';

const sendReportActionTypes = Object.freeze({
  started: 'SEND_REPORT_STARTED',
  success: 'SEND_REPORT_SUCCESS',
  failed: 'SEND_REPORT_FAILED',
});
const callServerEndpointOptions = { timeout: 60000 };
const sendReport =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    request: ClientReportCreationRequest,
  ) => Promise<ReportCreationResponse>) =>
  async request => {
    const response = await callServerEndpoint(
      'create_report',
      request,
      callServerEndpointOptions,
    );
    return { id: response.id };
  };

const sendReportsActionTypes = Object.freeze({
  started: 'SEND_REPORTS_STARTED',
  success: 'SEND_REPORTS_SUCCESS',
  failed: 'SEND_REPORTS_FAILED',
});
const sendReports =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    reports: $ReadOnlyArray<ClientReportCreationRequest>,
  ) => Promise<void>) =>
  async reports => {
    await callServerEndpoint(
      'create_reports',
      { reports },
      callServerEndpointOptions,
    );
  };

const queueReportsActionType = 'QUEUE_REPORTS';

export {
  sendReportActionTypes,
  sendReport,
  sendReportsActionTypes,
  sendReports,
  queueReportsActionType,
};
