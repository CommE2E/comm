// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFocused(): Promise<void> {
  await dbQuery(SQL`
    DELETE f
    FROM focused f
    LEFT JOIN threads t ON t.id = f.thread
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN sessions s ON s.id = f.session
    WHERE t.id IS NULL OR u.id IS NULL OR s.id IS NULL
  `);
}

export {
  deleteOrphanedFocused,
};
