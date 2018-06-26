// @flow

import type { Viewer } from '../session/viewer';
import type {
  ReportCreationRequest,
  ReportCreationResponse,
} from 'lib/types/report-types';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';

async function createReport(
  viewer: Viewer,
  request: ReportCreationRequest,
): Promise<ReportCreationResponse> {
  const [ id ] = await createIDs("reports", 1);
  const { type, platformDetails, ...report } = request;
  const row = [
    id,
    viewer.id,
    type,
    platformDetails.platform,
    JSON.stringify(report),
    Date.now(),
  ];
  const query = SQL`
    INSERT INTO reports (id, user, type, platform, report, creation_time)
    VALUES ${[row]}
  `;
  await dbQuery(query);
  return { id };
}

export default createReport;
