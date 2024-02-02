// @flow

import { fetchWithTimeout } from './fetch-utils.js';
import { createDefaultHTTPRequestHeaders } from './services-utils.js';
import {
  reportsServiceURL,
  sendReportEndpoint,
} from '../facts/reports-service.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type {
  ReportsServiceSendReportsRequest,
  ReportsServiceSendReportsResponse,
  ReportCreationRequest,
  ClientReportCreationRequest,
} from '../types/report-types.js';

const REQUEST_TIMEOUT = 60 * 1000; // 60s

async function sendReports(
  reports: ReportsServiceSendReportsRequest,
  authMetadata?: ?AuthMetadata,
): Promise<ReportsServiceSendReportsResponse> {
  const reportsArray: $ReadOnlyArray<ClientReportCreationRequest> =
    Array.isArray(reports) ? reports : [reports];

  if (reportsArray.length === 0) {
    return { reportIDs: [] };
  }

  const requestBody: $ReadOnlyArray<ReportCreationRequest> = reportsArray.map(
    clientReport => {
      const { id, ...report } = clientReport;
      return report;
    },
  );
  const url = `${reportsServiceURL}${sendReportEndpoint.path}`;
  const defaultHeaders =
    authMetadata?.userID && authMetadata?.accessToken && authMetadata?.deviceID
      ? createDefaultHTTPRequestHeaders(authMetadata)
      : {};
  const response = await fetchWithTimeout(url, {
    method: sendReportEndpoint.method,
    body: JSON.stringify(requestBody),
    headers: {
      ...defaultHeaders,
      'Content-Type': 'application/json',
    },
    timeout: REQUEST_TIMEOUT,
  });

  if (!response.ok) {
    const { status, statusText } = response;
    let responseText, errorMessage;
    try {
      responseText = await response.text();
    } finally {
      errorMessage = responseText || statusText || '-';
    }
    // we cannot throw error inside `finally` block because eslint complains
    throw new Error(`Server responded with HTTP ${status}: ${errorMessage}`);
  }

  const { reportIDs } = await response.json();
  return { reportIDs };
}

export { sendReports };
