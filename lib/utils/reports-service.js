// @flow

import {
  reportsServiceURL,
  sendReportEndpoint,
} from '../facts/reports-service.js';
import type {
  ReportsServiceSendReportsRequest,
  ReportsServiceSendReportsResponse,
} from '../types/report-types.js';

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
  const response = await fetch(url, {
    method: sendReportEndpoint.method,
    body: JSON.stringify(requestBody),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const { status, statusText } = response;
    let responseText;
    try {
      responseText = await response.text();
    } catch {}
    throw new Error(
      `Server responded with HTTP ${status}: ${
        responseText || statusText || '-'
      }`,
    );
  }

  const { reportIDs } = await response.json();
  return { reportIDs };
}

export { sendReports };
