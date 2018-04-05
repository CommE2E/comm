// @flow

import {
  type UpdateInfo,
  type UpdateData,
  updateType,
} from 'lib/types/update-types';

import { updateInfoFromUpdateData } from 'lib/shared/update-utils';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';

async function createUpdates(
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
    if (updateData.type === updateType.DELETE_ACCOUNT) {
      content = JSON.stringify({ deletedUserID: updateData.deletedUserID });
    }
    insertRows.push([
      ids[i],
      updateData.userID,
      updateData.type,
      content,
      updateData.time,
    ]);
  }

  const insertQuery = SQL`
    INSERT INTO updates(id, user, type, content, time)
    VALUES ${insertRows}
  `;
  await dbQuery(insertQuery);

  return updateInfos;
}

export {
  createUpdates,
};
