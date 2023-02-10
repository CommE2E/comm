// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedRoles(): Promise<void> {
  await dbQuery(SQL`
    DELETE r, i
    FROM roles r
    LEFT JOIN ids i ON i.id = r.id
    LEFT JOIN threads t ON t.id = r.thread
    WHERE t.id IS NULL
  `);
}

export { deleteOrphanedRoles };
