// @flow

import type { UserInfo } from 'lib/types/user-types';

import { pool, SQL } from '../database';

async function fetchUserInfos(
  userIDs: string[],
): Promise<{[id: string]: UserInfo}> {
  if (userIDs.length <= 0) {
    return {};
  }

  const query = SQL`
    SELECT id, username FROM users WHERE id IN (${userIDs})
  `;
  const [ result ] = await pool.query(query);

  const userInfos = {};
  for (let row of result) {
    userInfos[row.id] = {
      id: row.id,
      username: row.username,
    };
  }
  for (let userID of userIDs) {
    if (!userInfos[userID]) {
      userInfos[userID] = {
        id: userID,
        username: null,
      };
    }
  }

  return userInfos;
}

export {
  fetchUserInfos,
};
