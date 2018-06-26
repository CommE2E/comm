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
import _uniq from 'lodash/fp/uniq';
import _intersection from 'lodash/fp/intersection';

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
import {
  keyForUpdateData,
  keyForUpdateInfo,
  conditionKeyForUpdateData,
} from 'lib/shared/update-utils';

import { dbQuery, SQL, SQLStatement, mergeAndConditions } from '../database';
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
      calendarQuery: ?CalendarQuery,
    |};
type UpdatesResult = {|
  viewerUpdates: $ReadOnlyArray<UpdateInfo>,
  userInfos: {[id: string]: AccountUserInfo},
|};
const emptyArray = [];
const defaultResult = { viewerUpdates: [], userInfos: {} };
const sortFunction = (
  a: UpdateData | UpdateInfo,
  b: UpdateData | UpdateInfo,
) => a.time - b.time;

async function createUpdates(
  updateDatas: $ReadOnlyArray<UpdateData>,
  viewerInfo?: ViewerInfo,
): Promise<UpdatesResult> {
  if (updateDatas.length === 0) {
    return defaultResult;
  }
  const sortedUpdateDatas = [...updateDatas].sort(sortFunction);

  const filteredUpdateDatas: UpdateData[] = [];
  const keyedUpdateDatas: Map<string, UpdateData[]> = new Map();
  const deleteConditions: Map<string, number[]> = new Map();
  for (let updateData of sortedUpdateDatas) {
    let types;
    if (updateData.type === updateTypes.UPDATE_THREAD) {
      types = [
        updateTypes.UPDATE_THREAD,
        updateTypes.UPDATE_THREAD_READ_STATUS,
      ];
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      types = [ updateTypes.UPDATE_THREAD_READ_STATUS ];
    } else if (
      updateData.type === updateTypes.DELETE_THREAD ||
      updateData.type === updateTypes.JOIN_THREAD
    ) {
      types = [];
    } else {
      filteredUpdateDatas.push(updateData);
      continue;
    }
    const conditionKey = conditionKeyForUpdateData(updateData);
    invariant(conditionKey && types, "should be set");

    // Possibly filter any existing UpdateDatas based on this one
    let keyUpdateDatas = keyedUpdateDatas.get(conditionKey);
    let keyUpdateDatasChanged = false;
    if (!keyUpdateDatas) {
      keyUpdateDatas = [];
    } else if (types.length === 0) {
      keyUpdateDatas = [];
      keyUpdateDatasChanged = true;
    } else {
      const filteredKeyUpdateDatas = keyUpdateDatas.filter(
        updateData => types.indexOf(updateData.type) === -1,
      );
      if (filteredKeyUpdateDatas.length === 0) {
        keyUpdateDatas = [];
        keyUpdateDatasChanged = true;
      } else if (filteredKeyUpdateDatas.length !== keyUpdateDatas.length) {
        keyUpdateDatas = filteredKeyUpdateDatas;
        keyUpdateDatasChanged = true;
      }
    }

    // Update the deleteConditions and add our UpdateData to keyedUpdateDatas
    const existingTypes = deleteConditions.get(conditionKey);
    if (types.length === 0) {
      // If this UpdateData says to delete all the others, then include it, and
      // update the deleteConditions (if they don't already say to delete)
      if (!existingTypes || existingTypes.length !== 0) {
        deleteConditions.set(conditionKey, emptyArray);
      }
      keyUpdateDatas.push(updateData);
      keyUpdateDatasChanged = true;
    } else if (!existingTypes) {
      // If there were no existing conditions, then set the deleteConditions and
      // include this UpdateData
      deleteConditions.set(conditionKey, types);
      keyUpdateDatas.push(updateData);
      keyUpdateDatasChanged = true;
    } else {
      // Finally, if we have a list of types to delete, both existing and new,
      // then merge the list for the deleteConditions, and include this
      // UpdateData as long as its list of types isn't a strict subset of the
      // existing one.
      const newTypes = _uniq([...existingTypes, ...types]);
      deleteConditions.set(conditionKey, newTypes);
      const intersection = _intersection(existingTypes)(types);
      if (
        intersection.length !== types.length ||
        intersection.length === existingTypes.length
      ) {
        keyUpdateDatas.push(updateData);
        keyUpdateDatasChanged = true;
      }
    }

    if (!keyUpdateDatasChanged) {
      continue;
    }
    if (keyUpdateDatas.length === 0) {
      keyedUpdateDatas.delete(conditionKey);
    } else {
      keyedUpdateDatas.set(conditionKey, keyUpdateDatas);
    }
  }

  for (let [ conditionKey, updateDatas ] of keyedUpdateDatas) {
    filteredUpdateDatas.push(...updateDatas);
  }
  const ids = await createIDs("updates", filteredUpdateDatas.length);

  const viewerUpdateDatas: ViewerUpdateData[] = [];
  const insertRows: (?(number | string))[][] = [];
  const earliestTime: Map<string, number> = new Map();
  for (let i = 0; i < filteredUpdateDatas.length; i++) {
    const updateData = filteredUpdateDatas[i];
    if (viewerInfo && updateData.userID === viewerInfo.viewer.id) {
      viewerUpdateDatas.push({ data: updateData, id: ids[i] });
    }

    let content;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      content = JSON.stringify({ threadID: updateData.threadID });
    } else if (updateData.type === updateTypes.UPDATE_THREAD_READ_STATUS) {
      const { threadID, unread } = updateData;
      content = JSON.stringify({ threadID, unread });
    } else if (
      updateData.type === updateTypes.DELETE_THREAD ||
      updateData.type === updateTypes.JOIN_THREAD
    ) {
      const { threadID } = updateData;
      content = JSON.stringify({ threadID });
    } else {
      invariant(false, `unrecognized updateType ${updateData.type}`);
    }

    const key = keyForUpdateData(updateData);
    if (key) {
      const conditionKey = `${updateData.userID}|${key}`;
      const currentEarliestTime = earliestTime.get(conditionKey);
      if (!currentEarliestTime || updateData.time < currentEarliestTime) {
        earliestTime.set(conditionKey, updateData.time);
      }
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

  const deleteSQLConditions: SQLStatement[] = [...deleteConditions].map(
    ([ conditionKey: string, types: number[] ]) => {
      const [ userID, key ] = conditionKey.split('|');
      const conditions = [ SQL`u.user = ${userID}`, SQL`u.key = ${key}` ];
      if (types.length > 0) {
        conditions.push(SQL`u.type IN (${types})`);
      }
      const earliestTimeForCondition = earliestTime.get(conditionKey);
      if (earliestTimeForCondition) {
        conditions.push(SQL`u.time < ${earliestTimeForCondition}`);
      }
      return mergeAndConditions(conditions);
    },
  );

  const promises = {};

  if (insertRows.length > 0) {
    const insertQuery = viewerInfo
      ? SQL`
          INSERT INTO updates(id, user, type, \`key\`, content, time, updater_cookie)
        `
      : SQL`INSERT INTO updates(id, user, type, \`key\`, content, time) `;
    insertQuery.append(SQL`VALUES ${insertRows}`);
    promises.insert = dbQuery(insertQuery);
  }

  if (deleteSQLConditions.length > 0) {
    promises.delete = deleteUpdatesByConditions(deleteSQLConditions);
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
  for (let viewerUpdateData of updateDatas) {
    const updateData = viewerUpdateData.data;
    if (
      !viewerInfo.threadInfos &&
      (updateData.type === updateTypes.UPDATE_THREAD ||
        updateData.type === updateTypes.JOIN_THREAD)
    ) {
      threadIDsNeedingFetch.add(updateData.threadID);
    }
    if (updateData.type === updateTypes.JOIN_THREAD) {
      threadIDsNeedingDetailedFetch.add(updateData.threadID);
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
    const threadSelectionCriteria = { threadCursors: {} };
    for (let threadID of threadIDsNeedingDetailedFetch) {
      threadSelectionCriteria.threadCursors[threadID] = false;
    }
    promises.messageInfosResult = fetchMessageInfos(
      viewerInfo.viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    );
    // defaultCalendarQuery will only ever get used in the case of a legacy
    // client calling join_thread without specifying a CalendarQuery. Those
    // legacy clients will be discarding the UpdateInfos anyways, so we don't
    // need to worry about the CalendarQuery correctness.
    calendarQuery = viewerInfo.calendarQuery
      ? viewerInfo.calendarQuery
      : defaultCalendarQuery();
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

  updateInfos.sort(sortFunction);

  // Now we'll attempt to merge UpdateInfos so that we only have one per key
  const updateForKey: Map<string, UpdateInfo> = new Map();
  const mergedUpdates: UpdateInfo[] = [];
  for (let updateInfo of updateInfos) {
    const key = keyForUpdateInfo(updateInfo);
    if (!key) {
      mergedUpdates.push(updateInfo);
      continue;
    } else if (
      updateInfo.type === updateTypes.DELETE_THREAD ||
      updateInfo.type === updateTypes.JOIN_THREAD
    ) {
      updateForKey.set(key, updateInfo);
      continue;
    }
    const currentUpdateInfo = updateForKey.get(key);
    if (!currentUpdateInfo) {
      updateForKey.set(key, updateInfo);
    } else if (
      updateInfo.type === updateTypes.UPDATE_THREAD &&
      currentUpdateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS
    ) {
      // UPDATE_THREAD trumps UPDATE_THREAD_READ_STATUS
      // Note that we keep the oldest UPDATE_THREAD
      updateForKey.set(key, updateInfo);
    } else if (
      updateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS &&
      currentUpdateInfo.type === updateTypes.UPDATE_THREAD_READ_STATUS
    ) {
      // If we only have UPDATE_THREAD_READ_STATUS, keep the most recent
      updateForKey.set(key, updateInfo);
    }
  }
  for (let [key, updateInfo] of updateForKey) {
    mergedUpdates.push(updateInfo);
  }
  mergedUpdates.sort(sortFunction);

  return { updateInfos: mergedUpdates, userInfos };
}

export {
  createUpdates,
  fetchUpdateInfosWithUpdateDatas,
};
