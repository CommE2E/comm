// @flow

import { type SupportedReports } from '../types/report-types';
import { useSelector } from './redux-utils';

function useIsReportEnabled(reportType: SupportedReports): boolean {
  return useSelector((state) => state.enabledReports[reportType]);
}

export { useIsReportEnabled };
