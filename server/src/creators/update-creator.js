// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { AccountUserInfo } from 'lib/types/user-types';
import {
  defaultNumberPerThread,
  type FetchMessageInfosResult,
} from 'lib/types/message-types';
import type {
  FetchEntryInfosResponse,
  CalendarQuery,
} from 'lib/types/entry-types';

import invariant from 'invariant';

import { promiseAll } from 'lib/utils/promises';
import {
  defaultCalendarQuery,
  usersInRawEntryInfos,
} from 'lib/shared/entry-utils';
import { usersInThreadInfo } from 'lib/shared/thread-utils';
import { usersInMessageInfos } from 'lib/shared/message-utils';
import {
  nonThreadCalendarFilters,
} from 'lib/selectors/calendar-filter-selectors';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { deleteUpdatesByConditions } from '../deleters/update-deleters';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';

// If the viewer is not passed in, the returned array will be empty, and the
// update won't have an updater_cookie. This should only be done when we are
// sure none of the updates are destined for the viewer.
export type ViewerInfo =
  | {| viewer: Viewer |}
  | {|
      viewer: Viewer,
      threadInfos: {[id: string]: RawThreadInfo},
      userInfos: {[id: string]: AccountUserInfo},
    |};
type UpdatesResult = {|
  viewerUpdates: $ReadOnlyArray<UpdateInfo>,
  userInfos: {[id: string]: AccountUserInfo},
|};
const defaultResult = { viewerUpdates: [], userInfos: {} };
async function createUpdates(
  updateDatas: $ReadOnlyArray<UpdateData>,
  viewerInfo?: ViewerInfo,
): Promise<UpdatesResult> {
  if (updateDatas.length === 0) {
    return defaultResult;
  }
  const ids = await createIDs("updates", updateDatas.length);

  const viewerUpdateDatas: ViewerUpdateData[] = [];
  const insertRows = [];
  const deleteConditions = [];
  for (let i = 0; i < updateDatas.length; i++) {
    const updateData = updateDatas[i];
    if (viewerInfo && updateData.userID === viewerInfo.viewer.id) {
      viewerUpdateDatas.push({ data: updateData, id: ids[i] });
    }

    let content, key;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
      key = null;
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      content = JSON.stringify({ threadID: updateData.threadID });
      key = updateData.threadID;
      const deleteTypes = [
        updateTypes.UPDATE_THREAD,
        updateTypes.UPDATE_THREAD_READ_STATUS,
      ];
      deleteConditions.push(
        SQL`(
          u.user = ${updateData.userID} AND
          u.key = ${key} AND
          u.type IN (${deleteTypes})
        )`
      );
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      const { threadID, unread } = updateData;
      content = JSON.stringify({ threadID, unread });
      key = threadID;
      deleteConditions.push(
        SQL`(
          u.user = ${updateData.userID} AND
          u.key = ${key} AND
          u.type = ${updateData.type}
        )`
      );
    } else if (
      updateData.type === updateTypes.DELETE_THREAD ||
      updateData.type === updateTypes.JOIN_THREAD
    ) {
      const { threadID } = updateData;
      content = JSON.stringify({ threadID });
      key = threadID;
      deleteConditions.push(
        SQL`(u.user = ${updateData.userID} AND u.key = ${key})`
      );
    }
    const insertRow = [
      ids[i],
      updateData.userID,
      updateData.type,
      key,
      content,
      updateData.time,
    ];
    if (viewerInfo) {
      insertRow.push(viewerInfo.viewer.cookieID);
    }
    insertRows.push(insertRow);
  }

  const promises = {};

  const insertQuery = viewerInfo
    ? SQL`
        INSERT INTO updates(id, user, type, key, content, time, updater_cookie)
      `
    : SQL`INSERT INTO updates(id, user, type, key, content, time) `;
  insertQuery.append(SQL`VALUES ${insertRows}`);
  promises.insert = dbQuery(insertQuery);

  if (deleteConditions.length > 0) {
    promises.delete = deleteUpdatesByConditions(deleteConditions);
  }

  if (viewerUpdateDatas.length > 0) {
    invariant(viewerInfo, "should be set");
    promises.updatesResult = fetchUpdateInfosWithUpdateDatas(
      viewerUpdateDatas,
      viewerInfo,
    );
  }

  const { updatesResult } = await promiseAll(promises);
  if (!updatesResult) {
    return defaultResult;
  }
  const { updateInfos, userInfos } = updatesResult;
  return { viewerUpdates: updateInfos, userInfos };
}

export type ViewerUpdateData = {| data: UpdateData, id: string |};
export type FetchUpdatesResult = {|
  updateInfos: $ReadOnlyArray<UpdateInfo>,
  userInfos: {[id: string]: AccountUserInfo},
|};
async function fetchUpdateInfosWithUpdateDatas(
  updateDatas: $ReadOnlyArray<ViewerUpdateData>,
  viewerInfo: ViewerInfo,
): Promise<FetchUpdatesResult> {
  const threadIDsNeedingFetch = new Set();
  const threadIDsNeedingDetailedFetch = new Set(); // entries and messages
  if (!viewerInfo.threadInfos) {
    for (let viewerUpdateData of updateDatas) {
      const updateData = viewerUpdateData.data;
      if (
        updateData.type === updateTypes.UPDATE_THREAD ||
        updateData.type === updateTypes.JOIN_THREAD
      ) {
        threadIDsNeedingFetch.add(updateData.threadID);
      }
      if (updateData.type === updateTypes.JOIN_THREAD) {
        threadIDsNeedingDetailedFetch.add(updateData.threadID);
      }
    }
  }

  const promises = {};

  if (threadIDsNeedingFetch.size > 0) {
    promises.threadResult = fetchThreadInfos(
      viewerInfo.viewer,
      SQL`t.id IN (${[...threadIDsNeedingFetch]})`,
    );
  }

  let calendarQuery;
  if (threadIDsNeedingDetailedFetch.size > 0) {
    const threadSelectionCriteria = {};
    for (let threadID of threadIDsNeedingDetailedFetch) {
      threadSelectionCriteria[threadID] = false;
    }
    promises.messageInfosResult = fetchMessageInfos(
      viewerInfo.viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    );
    calendarQuery = defaultCalendarQuery();
    calendarQuery.filters = [
      ...nonThreadCalendarFilters(calendarQuery.filters),
      { type: "threads", threadIDs: [...threadIDsNeedingDetailedFetch] },
    ];
    promises.entryInfosResult = fetchEntryInfos(
      viewerInfo.viewer,
      calendarQuery,
    );
  }

  const {
    threadResult,
    messageInfosResult,
    entryInfosResult,
  } = await promiseAll(promises);

  let threadInfosResult;
  if (viewerInfo.threadInfos) {
    const { threadInfos, userInfos } = viewerInfo;
    threadInfosResult = { threadInfos, userInfos };
  } else if (threadResult) {
    threadInfosResult = threadResult;
  } else {
    threadInfosResult = { threadInfos: {}, userInfos: {} };
  }

  return updateInfosFromUpdateDatas(
    updateDatas,
    { threadInfosResult, messageInfosResult, calendarQuery, entryInfosResult },
  );
}

export type UpdateInfosRawData = {|
  threadInfosResult: FetchThreadInfosResult,
  messageInfosResult: ?FetchMessageInfosResult,
  calendarQuery?: CalendarQuery,
  entryInfosResult: ?FetchEntryInfosResponse,
|};
function updateInfosFromUpdateDatas(
  updateDatas: $ReadOnlyArray<ViewerUpdateData>,
  rawData: UpdateInfosRawData,
): FetchUpdatesResult {
  const {
    threadInfosResult,
    messageInfosResult,
    calendarQuery,
    entryInfosResult,
  } = rawData;
  const updateInfos = [];
  let userIDs = new Set();
  for (let viewerUpdateData of updateDatas) {
    const { data: updateData, id } = viewerUpdateData;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      updateInfos.push({
        type: updateTypes.DELETE_ACCOUNT,
        id,
        time: updateData.time,
        deletedUserID: updateData.deletedUserID,
      });
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      const threadInfo = threadInfosResult.threadInfos[updateData.threadID];
      for (let member of threadInfo.members) {
        userIDs.add(member.id);
      }
      updateInfos.push({
        type: updateTypes.UPDATE_THREAD,
        id,
        time: updateData.time,
        threadInfo,
      });
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      updateInfos.push({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        id,
        time: updateData.time,
        threadID: updateData.threadID,
        unread: updateData.unread,
      });
    } else if (updateData.type === updateTypes.DELETE_THREAD) {
      updateInfos.push({
        type: updateTypes.DELETE_THREAD,
        id,
        time: updateData.time,
        threadID: updateData.threadID,
      });
    } else if (updateData.type === updateTypes.JOIN_THREAD) {
      const threadInfo = threadInfosResult.threadInfos[updateData.threadID];
      const rawEntryInfos = [];
      invariant(entryInfosResult, "should be set");
      for (let entryInfo of entryInfosResult.rawEntryInfos) {
        if (entryInfo.threadID === updateData.threadID) {
          rawEntryInfos.push(entryInfo);
        }
      }
      const rawMessageInfos = [];
      invariant(messageInfosResult, "should be set");
      for (let messageInfo of messageInfosResult.rawMessageInfos) {
        if (messageInfo.threadID === updateData.threadID) {
          rawMessageInfos.push(messageInfo);
        }
      }
      userIDs = new Set([
        ...userIDs,
        ...usersInThreadInfo(threadInfo),
        ...usersInRawEntryInfos(rawEntryInfos),
        ...usersInMessageInfos(rawMessageInfos),
      ]);
      invariant(calendarQuery, "should be set");
      updateInfos.push({
        type: updateTypes.JOIN_THREAD,
        id,
        time: updateData.time,
        threadInfo,
        rawMessageInfos,
        truncationStatus:
          messageInfosResult.truncationStatuses[updateData.threadID],
        calendarQuery,
        rawEntryInfos,
      });
    } else {
      invariant(false, `unrecognized updateType ${updateData.type}`);
    }
  }

  const userInfos = {};
  for (let userID of userIDs) {
    const userInfo = threadInfosResult.userInfos[userID];
    if (userInfo) {
      userInfos[userID] = userInfo;
    }
  }

  return { updateInfos, userInfos };
}

export {
  createUpdates,
  fetchUpdateInfosWithUpdateDatas,
};
