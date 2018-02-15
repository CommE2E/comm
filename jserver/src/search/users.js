// @flow

import type { UserInfo } from 'lib/types/user-types';
import type { UserSearchQuery } from 'lib/types/search-types';

import { pool, SQL } from '../database';

async function searchForUsers(query: UserSearchQuery): Promise<UserInfo[]> {
  const sqlQuery = SQL`SELECT id, username FROM users `;
  const prefix = query.prefix;
  if (prefix) {
    sqlQuery.append(SQL`WHERE username LIKE ${prefix + "%"} `);
  }
  sqlQuery.append(SQL`LIMIT 20`);

  const [ result ] = await pool.query(sqlQuery);

  const userInfos = [];
  for (let row of result) {
    userInfos.push({
      id: row.id.toString(),
      username: row.username,
    });
  }
  return userInfos;
}

export {
  searchForUsers,
};
