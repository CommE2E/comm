// @flow

import { dbQuery, SQL } from '../database';

async function fetchRelationship(firstUserID: string, secondUserID: string) {
  const query = SQL`
    SELECT user1, user2, status
    FROM relationships
    WHERE (user1 = ${firstUserID} AND user2 = ${secondUserID}) OR (user1 = ${secondUserID} AND user2 = ${firstUserID})
  `;
  return await dbQuery(query);
}

export { fetchRelationship };
