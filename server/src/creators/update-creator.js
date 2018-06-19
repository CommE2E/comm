// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from 'lib/types/update-types';

import { updateInfoFromUpdateData } from 'lib/shared/update-utils';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { deleteUpdatesByConditions } from '../deleters/update-deleters';

async function createUpdates(
  updateDatas: $ReadOnlyArray<UpdateData>,
  cookieID?: ?string,
): Promise<UpdateInfo[]> {
  if (updateDatas.length === 0) {
    return [];
  }
  const ids = await createIDs("updates", updateDatas.length);

  const updateInfos: UpdateInfo[] = [];
  const insertRows = [];
  const deleteConditions = [];
  for (let i = 0; i < updateDatas.length; i++) {
    const updateData = updateDatas[i];
    updateInfos.push(updateInfoFromUpdateData(updateData, ids[i]));

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
    if (cookieID) {
      insertRow.push(cookieID);
    }
    insertRows.push(insertRow);
  }

  const promises = [];

  const insertQuery = cookieID
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

  return updateInfos;
}

export {
  createUpdates,
};
