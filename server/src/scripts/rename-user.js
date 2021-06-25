// @flow

import { updateTypes } from 'lib/types/update-types';

import { createUpdates } from '../creators/update-creator';
import { dbQuery, SQL } from '../database/database';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';
import { createScriptViewer } from '../session/scripts';
import { main } from './utils';

const userID = '5';
const newUsername = 'commbot';

async function renameUser() {
  const [adjacentUsers] = await Promise.all([
    fetchKnownUserInfos(createScriptViewer(userID)),
    dbQuery(
      SQL`UPDATE users SET username = ${newUsername} WHERE id = ${userID}`,
    ),
  ]);

  const updateDatas = [];
  const time = Date.now();
  updateDatas.push({
    type: updateTypes.UPDATE_CURRENT_USER,
    userID,
    time,
  });
  for (const adjacentUserID in adjacentUsers) {
    updateDatas.push({
      type: updateTypes.UPDATE_USER,
      userID: adjacentUserID,
      time,
      updatedUserID: userID,
    });
  }
  await createUpdates(updateDatas);
}

main([renameUser]);
