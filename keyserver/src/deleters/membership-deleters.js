// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedMemberships(): Promise<void> {
  await dbQuery(SQL`
    DELETE m
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    WHERE t.id IS NULL
  `);
}

export { deleteOrphanedMemberships };
