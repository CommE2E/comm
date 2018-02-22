// @flow

import type { AccountUserInfo } from 'lib/types/user-types';
import type { UserSearchRequest } from 'lib/types/search-types';

import { pool, SQL } from '../database';

async function searchForUsers(
  query: UserSearchRequest,
): Promise<AccountUserInfo[]> {
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
