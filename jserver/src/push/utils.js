// @flow

import type { Connection } from '../database';
import { SQL } from '../database';

async function getUnreadCounts(
  conn: Connection,
  userIDs: string[],
): Promise<{ [userID: string]: number }> {
  const query = SQL`
    SELECT user, COUNT(thread) AS unread_count
    FROM memberships
    WHERE user IN (${userIDs}) AND unread = 1 AND role != 0
    GROUP BY user
  `;
  const [ result ] = await conn.query(query);
  const usersToUnreadCounts = {};
  for (let row of result) {
    usersToUnreadCounts[row.user.toString()] = row.unread_count;
  }
  for (let userID of userIDs) {
    if (usersToUnreadCounts[userID] === undefined) {
      usersToUnreadCounts[userID] = 0;
    }
  }
  return usersToUnreadCounts;
}

export {
  getUnreadCounts,
}
