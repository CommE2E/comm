// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type {
  ReportCreationRequest,
  ReportCreationResponse,
} from '../types/report-types';

const sendReportActionTypes = Object.freeze({
  started: "SEND_REPORT_STARTED",
  success: "SEND_REPORT_SUCCESS",
  failed: "SEND_REPORT_FAILED",
});
const fetchJSONOptions = { timeout: 60000 };
async function sendReport(
  fetchJSON: FetchJSON,
  request: ReportCreationRequest,
): Promise<ReportCreationResponse> {
  const response = await fetchJSON(
    'create_report',
    request,
    fetchJSONOptions,
  );
  return { id: response.id };
}

export {
  sendReportActionTypes,
  sendReport,
};
