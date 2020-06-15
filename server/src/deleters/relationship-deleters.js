// @flow

import { dbQuery, SQL } from '../database';

async function deleteRelationship(firstUserID: string, secondUserID: string) {
  const query = SQL`
    DELETE FROM relationships
    WHERE user1 = ${firstUserID} AND user2 = ${secondUserID}
`;
  await dbQuery(query);
}

export { deleteRelationship };
