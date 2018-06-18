// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateTypes,
} from 'lib/types/update-types';

import { updateInfoFromUpdateData } from 'lib/shared/update-utils';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';

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
  for (let i = 0; i < updateDatas.length; i++) {
    const updateData = updateDatas[i];
    updateInfos.push(updateInfoFromUpdateData(updateData, ids[i]));

    let content;
    if (updateData.type === updateTypes.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
    } else if (updateData.type === updateTypes.UPDATE_THREAD) {
      content = JSON.stringify(updateData.threadInfo);
    }
    const insertRow = [
      ids[i],
      updateData.userID,
      updateData.type,
      content,
      updateData.time,
    ];
    if (cookieID) {
      insertRow.push(cookieID);
    }
    insertRows.push(insertRow);
  }

  const insertQuery = cookieID
    ? SQL`INSERT INTO updates(id, user, type, content, time, updater_cookie) `
    : SQL`INSERT INTO updates(id, user, type, content, time) `;
  insertQuery.append(SQL`VALUES ${insertRows}`);
  await dbQuery(insertQuery);

  return updateInfos;
}

export {
  createUpdates,
};
