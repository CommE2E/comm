// @flow

import invariant from 'invariant';

import type { CalendarQuery } from 'lib/types/entry-types.js';
import {
  type RawUpdateInfo,
  updateTypes,
  assertUpdateType,
} from 'lib/types/update-types.js';
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

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function rawUpdateInfoFromRow(row: Object): RawUpdateInfo {
  const type = assertUpdateType(row.type);
  if (type === updateTypes.DELETE_ACCOUNT) {
    const content = JSON.parse(row.content);
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id: row.id.toString(),
      time: row.time,
      deletedUserID: content.deletedUserID,
    };
  } else if (type === updateTypes.UPDATE_THREAD) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.UPDATE_THREAD_READ_STATUS) {
    const { threadID, unread } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      id: row.id.toString(),
      time: row.time,
      threadID,
      unread,
    };
  } else if (type === updateTypes.DELETE_THREAD) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.DELETE_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.JOIN_THREAD) {
    const { threadID } = JSON.parse(row.content);
    return {
      type: updateTypes.JOIN_THREAD,
      id: row.id.toString(),
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.BAD_DEVICE_TOKEN) {
    const { deviceToken } = JSON.parse(row.content);
    return {
      type: updateTypes.BAD_DEVICE_TOKEN,
      id: row.id.toString(),
      time: row.time,
      deviceToken,
    };
  } else if (type === updateTypes.UPDATE_ENTRY) {
    const { entryID } = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_ENTRY,
      id: row.id.toString(),
      time: row.time,
      entryID,
    };
  } else if (type === updateTypes.UPDATE_CURRENT_USER) {
    return {
      type: updateTypes.UPDATE_CURRENT_USER,
      id: row.id.toString(),
      time: row.time,
    };
  } else if (type === updateTypes.UPDATE_USER) {
    const content = JSON.parse(row.content);
    return {
      type: updateTypes.UPDATE_USER,
      id: row.id.toString(),
      time: row.time,
      updatedUserID: content.updatedUserID,
    };
  }
  invariant(false, `unrecognized updateType ${type}`);
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
