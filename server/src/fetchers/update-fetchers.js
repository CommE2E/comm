// @flow

import {
  type RawUpdateInfo,
  updateTypes,
  assertUpdateType,
} from 'lib/types/update-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import {
  type FetchUpdatesResult,
  fetchUpdateInfosWithRawUpdateInfos,
} from '../creators/update-creator';

async function fetchUpdateInfos(
  viewer: Viewer,
  currentAsOf: number,
  calendarQuery: CalendarQuery,
): Promise<FetchUpdatesResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND time > ${currentAsOf}
      AND (updater IS NULL OR updater != ${viewer.session})
      AND (target IS NULL OR target = ${viewer.session})
    ORDER BY time ASC
  `;
  const [ result ] = await dbQuery(query);

  const rawUpdateInfos = [];
  for (let row of result) {
    rawUpdateInfos.push(rawUpdateInfoFromRow(row));
  }

  return await fetchUpdateInfosWithRawUpdateInfos(
    rawUpdateInfos,
    { viewer, calendarQuery },
  );
}

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
  }
  invariant(false, `unrecognized updateType ${type}`);
}

export {
  fetchUpdateInfos,
};
