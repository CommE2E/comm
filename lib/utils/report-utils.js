// @flow

import { useSelector } from './redux-utils.js';
import { getUUID } from './uuid.js';
import {
  type SupportedReports,
  type EnabledReports,
  type ClientReportCreationRequest,
  reportTypes,
} from '../types/report-types.js';

function useIsReportEnabled(reportType: SupportedReports): boolean {
  return useSelector(state => state.reportStore.enabledReports[reportType]);
}

// maximum size of reports without std::string overhead
const MAX_REPORT_LENGTH = 200_000_000 - 90000;
function isReportSizeValid(report: ClientReportCreationRequest): boolean {
  try {
    return JSON.stringify(report).length < MAX_REPORT_LENGTH;
  } catch (e) {
    return false;
  }
}

function isReportEnabled(
  report: ClientReportCreationRequest,
  enabledReports: EnabledReports,
): boolean {
  const isReportTypeEnabled =
    (report.type === reportTypes.MEDIA_MISSION &&
      enabledReports.mediaReports) ||
    (report.type === reportTypes.ERROR && enabledReports.crashReports) ||
    ((report.type === reportTypes.ENTRY_INCONSISTENCY ||
      report.type === reportTypes.THREAD_INCONSISTENCY) &&
      enabledReports.inconsistencyReports);

  return isReportTypeEnabled && isReportSizeValid(report);
}

function generateReportID(): string {
  return getUUID();
}

export { useIsReportEnabled, isReportEnabled, generateReportID };
