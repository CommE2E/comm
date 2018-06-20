// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { AccountUserInfo } from 'lib/types/user-types';

import invariant from 'invariant';

import { promiseAll } from 'lib/utils/promises';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { deleteUpdatesByConditions } from '../deleters/update-deleters';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../fetchers/thread-fetchers';

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
    } else if (updateData.type === updateTypes.DELETE_THREAD) {
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
  if (!viewerInfo.threadInfos) {
    for (let viewerUpdateData of updateDatas) {
      const updateData = viewerUpdateData.data;
      if (updateData.type === updateTypes.UPDATE_THREAD) {
        threadIDsNeedingFetch.add(updateData.threadID);
      }
    }
  }

  let threadResult = undefined;
  if (threadIDsNeedingFetch.size > 0) {
    threadResult = await fetchThreadInfos(
      viewerInfo.viewer,
      SQL`t.id IN (${[...threadIDsNeedingFetch]})`,
    );
  }

  if (viewerInfo.threadInfos) {
    const { threadInfos, userInfos } = viewerInfo;
    return updateInfosFromUpdateDatas(updateDatas, { threadInfos, userInfos });
  } else if (threadResult) {
    return updateInfosFromUpdateDatas(updateDatas, threadResult);
  } else {
    return updateInfosFromUpdateDatas(
      updateDatas,
      { threadInfos: {}, userInfos: {} },
    );
  }
}

function updateInfosFromUpdateDatas(
  updateDatas: $ReadOnlyArray<ViewerUpdateData>,
  threadInfosResult: FetchThreadInfosResult,
): FetchUpdatesResult {
  const updateInfos = [];
  const userIDs = new Set();
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
  updateInfosFromUpdateDatas,
};
