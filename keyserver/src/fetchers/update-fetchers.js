// @flow

import { updateSpecs } from 'lib/shared/updates/update-specs.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import { updateTypes, assertUpdateType } from 'lib/types/update-types-enum.js';
import { type RawUpdateInfo } from 'lib/types/update-types.js';
import { ServerError } from 'lib/utils/errors.js';

import {
  type ViewerInfo,
  type FetchUpdatesResult,
  fetchUpdateInfosWithRawUpdateInfos,
} from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import type { Viewer } from '../session/viewer.js';

const defaultUpdateFetchResult = { updateInfos: [], userInfos: {} };

async function fetchUpdateInfosWithQuery(
  viewerInfo: ViewerInfo,
  query: SQLStatementType,
): Promise<FetchUpdatesResult> {
  if (!viewerInfo.viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }
  if (viewerInfo.viewer.isScriptViewer) {
    return defaultUpdateFetchResult;
  }
  const [result] = await dbQuery(query);
  const rawUpdateInfos = [];
  for (const row of result) {
    rawUpdateInfos.push(rawUpdateInfoFromRow(row));
  }
  return await fetchUpdateInfosWithRawUpdateInfos(rawUpdateInfos, viewerInfo);
}

function fetchUpdateInfos(
  viewer: Viewer,
  currentAsOf: number,
  calendarQuery: CalendarQuery,
): Promise<FetchUpdatesResult> {
  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND time > ${currentAsOf}
      AND (updater IS NULL OR updater != ${viewer.session})
      AND (target IS NULL OR target = ${viewer.session})
    ORDER BY time ASC
  `;
  return fetchUpdateInfosWithQuery({ viewer, calendarQuery }, query);
}

function rawUpdateInfoFromRow(row: Object): RawUpdateInfo {
  const type = assertUpdateType(row.type);
  return updateSpecs[type].rawUpdateInfoFromRow(row);
}

const entryIDExtractString = '$.entryID';
function fetchUpdateInfoForEntryUpdate(
  viewer: Viewer,
  entryID: string,
): Promise<FetchUpdatesResult> {
  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND
      type = ${updateTypes.UPDATE_ENTRY} AND
      JSON_EXTRACT(content, ${entryIDExtractString}) = ${entryID}
    ORDER BY time DESC
    LIMIT 1
  `;
  return fetchUpdateInfosWithQuery({ viewer }, query);
}

const threadIDExtractString = '$.threadID';
function fetchUpdateInfoForThreadDeletion(
  viewer: Viewer,
  threadID: string,
): Promise<FetchUpdatesResult> {
  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND
      type = ${updateTypes.DELETE_THREAD} AND
      JSON_EXTRACT(content, ${threadIDExtractString}) = ${threadID}
    ORDER BY time DESC
    LIMIT 1
  `;
  return fetchUpdateInfosWithQuery({ viewer }, query);
}

export {
  fetchUpdateInfos,
  fetchUpdateInfoForEntryUpdate,
  fetchUpdateInfoForThreadDeletion,
};
