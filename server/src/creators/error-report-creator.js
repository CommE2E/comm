// @flow

import type { Viewer } from '../session/viewer';
import type {
  ErrorReportCreationRequest,
  ErrorReportCreationResponse,
} from 'lib/types/report-types';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';

async function createErrorReport(
  viewer: Viewer,
  errorReport: ErrorReportCreationRequest,
): Promise<ErrorReportCreationResponse> {
  const [ id ] = await createIDs("reports", 1);
  const { deviceType, ...report } = errorReport;
  const row = [
    id,
    viewer.id,
    deviceType,
    JSON.stringify(report),
    Date.now(),
  ];
  const query = SQL`
    INSERT INTO reports (id, user, platform, report, creation_time)
    VALUES ${[row]}
  `;
  await dbQuery(query);
  return { id };
}

export default createErrorReport;
