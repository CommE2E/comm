// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedMessages(): Promise<void> {
  await dbQuery(SQL`
    DELETE m, i, up, iu
    FROM messages m
    LEFT JOIN ids i ON i.id = m.id
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN uploads up ON up.container = m.id
    LEFT JOIN ids iu ON iu.id = up.id
    WHERE t.id IS NULL
  `);
}

export { deleteOrphanedMessages };
