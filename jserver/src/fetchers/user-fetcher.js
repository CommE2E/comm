// @flow

import type { Connection } from '../database';

import { SQL } from '../database';

async function fetchUserInfos(
  conn: Connection,
  userIDs: string[],
) {
  if (userIDs.length <= 0) {
    return {};
  }

  const query = SQL`
    SELECT id, username FROM users WHERE id IN (${userIDs})
  `;
  const [ result ] = await conn.query(query);

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
