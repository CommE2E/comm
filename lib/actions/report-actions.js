// @flow

import * as React from 'react';

import {
  IdentityClientContext,
  type AuthMetadata,
} from '../shared/identity-client-context.js';
import type {
  ClientReportCreationRequest,
  ReportsServiceSendReportsAction,
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
  authMetadata: ?AuthMetadata,
) => Promise<ReportCreationResponse> = async (request, authMetadata) => {
  const {
    reportIDs: [id],
  } = await callSendReports([request], authMetadata);

  if (!id) {
    throw new Error('Server did not return report ID');
  }
  return { id };
};

function useSendReports(): ReportsServiceSendReportsAction {
  const identityContext = React.useContext(IdentityClientContext);
  const getAuthMetadata = identityContext?.getAuthMetadata;

  return React.useCallback(
    async request => {
      let authMetadata;
      if (getAuthMetadata) {
        authMetadata = await getAuthMetadata();
      }
      return callSendReports(request, authMetadata);
    },
    [getAuthMetadata],
  );
}

const sendReportsActionTypes = Object.freeze({
  started: 'SEND_REPORTS_STARTED',
  success: 'SEND_REPORTS_SUCCESS',
  failed: 'SEND_REPORTS_FAILED',
});

const queueReportsActionType = 'QUEUE_REPORTS' as const;

export {
  sendReportActionTypes,
  sendReport,
  sendReportsActionTypes,
  queueReportsActionType,
  useSendReports,
};
