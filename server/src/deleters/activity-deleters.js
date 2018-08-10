// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFocused(): Promise<void> {
  await dbQuery(SQL`
    DELETE f
    FROM focused f
    LEFT JOIN threads t ON t.id = f.thread
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN cookies c ON c.id = f.cookie
    WHERE t.id IS NULL OR u.id IS NULL OR c.id IS NULL
  `);
}

export {
  deleteOrphanedFocused,
};
