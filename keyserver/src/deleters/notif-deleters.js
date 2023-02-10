// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedNotifs(): Promise<void> {
  await dbQuery(SQL`
    DELETE n, i
    FROM notifications n
    LEFT JOIN ids i ON i.id = n.id
    LEFT JOIN threads t ON t.id = n.thread
    WHERE t.id IS NULL AND n.rescinded = 1
  `);
}

export { deleteOrphanedNotifs };
