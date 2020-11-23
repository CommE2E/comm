// @flow

import type { GlobalAccountUserInfo } from 'lib/types/user-types';
import type { UserSearchRequest } from 'lib/types/search-types';

import { dbQuery, SQL } from '../database/database';

async function searchForUsers(
  query: UserSearchRequest,
): Promise<GlobalAccountUserInfo[]> {
  const sqlQuery = SQL`SELECT id, username FROM users `;
  const prefix = query.prefix;
  if (prefix) {
    sqlQuery.append(SQL`WHERE LOWER(username) LIKE LOWER(${prefix + '%'}) `);
  }
  sqlQuery.append(SQL`LIMIT 20`);

  const [result] = await dbQuery(sqlQuery);

  const userInfos = [];
  for (let row of result) {
    userInfos.push({
      id: row.id.toString(),
      username: row.username,
    });
  }
  return userInfos;
}

export { searchForUsers };
