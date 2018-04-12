// @flow

import {
  type UpdateInfo,
  updateTypes,
  assertUpdateType,
} from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import { dbQuery, SQL } from '../database';

function updateInfoFromRow(row: Object): UpdateInfo {
  const type = assertUpdateType(row.type);
  if (type === updateTypes.DELETE_ACCOUNT) {
    const content = JSON.parse(row.content);
    return {
      type: updateTypes.DELETE_ACCOUNT,
      id: row.id,
      time: row.time,
      deletedUserID: content.deletedUserID,
    };
  } else {
    invariant(false, `unrecognized updateType ${type}`);
  }
}

async function fetchUpdateInfos(
  viewer: Viewer,
  currentAsOf: number,
): Promise<UpdateInfo[]> {
  const query = SQL`
    SELECT id, type, content, time
    FROM updates
    WHERE user = ${viewer.id} AND time > ${currentAsOf}
  `;
  const [ result ] = await dbQuery(query);

  const updateInfos = [];
  for (let row of result) {
    updateInfos.push(updateInfoFromRow(row));
  }
  return updateInfos;
}

export {
  fetchUpdateInfos,
};
