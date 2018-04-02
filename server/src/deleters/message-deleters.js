// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedMessages(): Promise<void> {
  await dbQuery(SQL`
    DELETE m, i
    FROM messages m
    LEFT JOIN ids i ON i.id = m.id
    LEFT JOIN threads t ON t.id = m.thread
    WHERE t.id IS NULL
  `);
}

export {
  deleteOrphanedMessages,
};
