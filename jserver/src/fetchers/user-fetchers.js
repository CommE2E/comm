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
    const id = row.id.toString();
    userInfos[id] = {
      id,
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

async function verifyUserIDs(
  userIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  if (userIDs.length === 0) {
    return [];
  }
  const query = SQL`SELECT id FROM users WHERE id IN (${userIDs})`;
  const [ result ] = await pool.query(query);
  return result.map(row => row.id.toString());
}

export {
  fetchUserInfos,
  verifyUserIDs,
};
