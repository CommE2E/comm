// @flow

import {
  type UpdateInfo,
  updateTypes,
  assertUpdateType,
} from 'lib/types/update-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';
import type { FetchThreadInfosResult } from '../fetchers/thread-fetchers';

import invariant from 'invariant';

import { dbQuery, SQL } from '../database';
import {
  type ViewerUpdateData,
  type FetchUpdatesResult,
  fetchUpdateInfosWithUpdateDatas,
} from '../creators/update-creator';

type UpdateInfoQueryInput = {|
  ...FetchThreadInfosResult,
  calendarQuery: CalendarQuery,
|};
async function fetchUpdateInfos(
  viewer: Viewer,
  currentAsOf: number,
  queryInput: UpdateInfoQueryInput,
): Promise<FetchUpdatesResult> {
  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND time > ${currentAsOf}
      AND (updater_cookie IS NULL OR updater_cookie != ${viewer.cookieID})
      AND (target_cookie IS NULL OR target_cookie = ${viewer.cookieID})
    ORDER BY time ASC
  `;
  const [ result ] = await dbQuery(query);

  const viewerUpdateDatas = [];
  for (let row of result) {
    viewerUpdateDatas.push(viewerUpdateDataFromRow(viewer, row));
  }

  return await fetchUpdateInfosWithUpdateDatas(
    viewerUpdateDatas,
    { viewer, ...queryInput },
  );
}

function viewerUpdateDataFromRow(
  viewer: Viewer,
  row: Object,
): ViewerUpdateData {
  const type = assertUpdateType(row.type);
  let data;
  const id = row.id.toString();
  if (type === updateTypes.DELETE_ACCOUNT) {
    const content = JSON.parse(row.content);
    data = {
      type: updateTypes.DELETE_ACCOUNT,
      userID: viewer.id,
      time: row.time,
      deletedUserID: content.deletedUserID,
    };
  } else if (type === updateTypes.UPDATE_THREAD) {
    const { threadID } = JSON.parse(row.content);
    data = {
      type: updateTypes.UPDATE_THREAD,
      userID: viewer.id,
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.UPDATE_THREAD_READ_STATUS) {
    const { threadID, unread } = JSON.parse(row.content);
    data = {
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      userID: viewer.id,
      time: row.time,
      threadID,
      unread,
    };
  } else if (type === updateTypes.DELETE_THREAD) {
    const { threadID } = JSON.parse(row.content);
    data = {
      type: updateTypes.DELETE_THREAD,
      userID: viewer.id,
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.JOIN_THREAD) {
    const { threadID } = JSON.parse(row.content);
    data = {
      type: updateTypes.JOIN_THREAD,
      userID: viewer.id,
      time: row.time,
      threadID,
    };
  } else if (type === updateTypes.BAD_DEVICE_TOKEN) {
    const { deviceToken } = JSON.parse(row.content);
    data = {
      type: updateTypes.BAD_DEVICE_TOKEN,
      userID: viewer.id,
      time: row.time,
      deviceToken,
      // This UpdateData is only used to generate a UpdateInfo,
      // and UpdateInfo doesn't care about the targetCookie field
      targetCookie: "",
    };
  } else if (type === updateTypes.UPDATE_ENTRY) {
    const { entryID } = JSON.parse(row.content);
    data = {
      type: updateTypes.UPDATE_ENTRY,
      userID: viewer.id,
      time: row.time,
      entryID,
      // This UpdateData is only used to generate a UpdateInfo,
      // and UpdateInfo doesn't care about the targetCookie field
      targetCookie: "",
    };
  } else {
    invariant(false, `unrecognized updateType ${type}`);
  }
  return { data, id };
}

export {
  fetchUpdateInfos,
};
