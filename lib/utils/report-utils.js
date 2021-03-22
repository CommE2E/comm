// @flow

import {
  type SupportedReports,
  type EnabledReports,
  type ClientReportCreationRequest,
  reportTypes,
} from '../types/report-types';
import { useSelector } from './redux-utils';

function useIsReportEnabled(reportType: SupportedReports): boolean {
  return useSelector(state => state.reportStore.enabledReports[reportType]);
}

function isReportEnabled(
  report: ClientReportCreationRequest,
  enabledReports: EnabledReports,
): boolean {
  return (
    (report.type === reportTypes.MEDIA_MISSION &&
      enabledReports.mediaReports) ||
    (report.type === reportTypes.ERROR && enabledReports.crashReports) ||
    ((report.type === reportTypes.ENTRY_INCONSISTENCY ||
      report.type === reportTypes.THREAD_INCONSISTENCY) &&
      enabledReports.inconsistencyReports)
  );
}

export { useIsReportEnabled, isReportEnabled };
