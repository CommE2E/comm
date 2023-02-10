// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedDays(): Promise<void> {
  await dbQuery(SQL`
    DELETE d, i
    FROM days d
    LEFT JOIN ids i ON i.id = d.id
    LEFT JOIN entries e ON e.day = d.id
    LEFT JOIN threads t ON t.id = d.thread
    WHERE e.day IS NULL OR t.id IS NULL
  `);
}

export { deleteOrphanedDays };
