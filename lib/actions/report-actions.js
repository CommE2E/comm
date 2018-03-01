// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  ErrorReportCreationRequest,
  ErrorReportCreationResponse,
} from '../types/report-types';

const sendErrorReportActionTypes = Object.freeze({
  started: "SEND_ERROR_REPORT_STARTED",
  success: "SEND_ERROR_REPORT_SUCCESS",
  failed: "SEND_ERROR_REPORT_FAILED",
});
async function sendErrorReport(
  fetchJSON: FetchJSON,
  request: ErrorReportCreationRequest,
): Promise<ErrorReportCreationResponse> {
  const response = await fetchJSON('create_error_report', request);
  return { id: response.id };
}

export {
  sendErrorReportActionTypes,
  sendErrorReport,
};
