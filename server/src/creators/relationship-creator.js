// @flow

import type { RelationshipStatus } from 'lib/types/relationship-types';

import { dbQuery, SQL } from '../database';

async function createRelationship(
  firstUserID: string,
  secondUserID: string,
  status: RelationshipStatus,
) {
  const row = [firstUserID, secondUserID, status];
  const query = SQL`
    INSERT INTO relationships(user1, user2, status)
    VALUES ${[row]}
  `;
  await dbQuery(query);
}

export { createRelationship };
