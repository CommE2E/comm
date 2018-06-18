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
  cookieID: string,
  updateDatas: $ReadOnlyArray<UpdateData>,
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
    insertRows.push([
      ids[i],
      updateData.userID,
      updateData.type,
      cookieID,
      content,
      updateData.time,
    ]);
  }

  const insertQuery = SQL`
    INSERT INTO updates(id, user, type, updater_cookie, content, time)
    VALUES ${insertRows}
  `;
  await dbQuery(insertQuery);

  return updateInfos;
}

export {
  createUpdates,
};
