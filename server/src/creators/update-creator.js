// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';

import { updateInfoFromUpdateData } from 'lib/shared/update-utils';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { deleteUpdatesByConditions } from '../deleters/update-deleters';

// If the viewer is not passed in, the returned array will be empty, and the
// update won't have an updater_cookie. This should only be done when we are
// sure none of the updates are destined for the viewer.
async function createUpdates(
  updateDatas: $ReadOnlyArray<UpdateData>,
  viewer?: Viewer,
): Promise<UpdateInfo[]> {
  if (updateDatas.length === 0) {
    return [];
  }
  const ids = await createIDs("updates", updateDatas.length);

  const viewerUpdates = [];
  const insertRows = [];
  const deleteConditions = [];
  for (let i = 0; i < updateDatas.length; i++) {
    const updateData = updateDatas[i];
    if (viewer && updateData.userID === viewer.id) {
      viewerUpdates.push(updateInfoFromUpdateData(updateData, ids[i]));
    }

    let content, key;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
      key = null;
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      content = JSON.stringify(updateData.threadInfo);
      key = updateData.threadInfo.id;
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
    if (viewer) {
      insertRow.push(viewer.cookieID);
    }
    insertRows.push(insertRow);
  }

  const promises = [];

  const insertQuery = viewer
    ? SQL`
        INSERT INTO updates(id, user, type, key, content, time, updater_cookie)
      `
    : SQL`INSERT INTO updates(id, user, type, key, content, time) `;
  insertQuery.append(SQL`VALUES ${insertRows}`);
  promises.push(dbQuery(insertQuery));

  if (deleteConditions.length > 0) {
    promises.push(deleteUpdatesByConditions(deleteConditions));
  }

  await Promise.all(promises);

  return viewerUpdates;
}

export {
  createUpdates,
};
