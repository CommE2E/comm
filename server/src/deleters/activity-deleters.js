// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFocused(): Promise<void> {
  await dbQuery(SQL`
    DELETE f
    FROM focused f
    LEFT JOIN threads t ON t.id = f.thread
    WHERE t.id IS NULL
  `);
}

export {
  deleteOrphanedFocused,
};
