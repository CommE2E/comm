// @flow

import { fetchWithTimeout } from './fetch-utils.js';
import {
  reportsServiceURL,
  sendReportEndpoint,
} from '../facts/reports-service.js';
import type {
  ReportsServiceSendReportsRequest,
  ReportsServiceSendReportsResponse,
} from '../types/report-types.js';

const REQUEST_TIMEOUT = 60 * 1000; // 60s

async function sendReports(
  reports: ReportsServiceSendReportsRequest,
): Promise<ReportsServiceSendReportsResponse> {
  const reportsArray = Array.isArray(reports) ? reports : [reports];

  if (reportsArray.length === 0) {
    return { reportIDs: [] };
  }

  const requestBody = reportsArray.map(clientReport => {
    const { id, ...report } = clientReport;
    return report;
  });
  const url = `${reportsServiceURL}${sendReportEndpoint.path}`;
  const response = await fetchWithTimeout(url, {
    method: sendReportEndpoint.method,
    body: JSON.stringify(requestBody),
    headers: {
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
