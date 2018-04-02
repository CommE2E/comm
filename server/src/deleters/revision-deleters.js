// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedRevisions(): Promise<void> {
  await dbQuery(SQL`
    DELETE r, i
    FROM revisions r
    LEFT JOIN ids i ON i.id = r.id
    LEFT JOIN entries e ON e.id = r.entry
    WHERE e.id IS NULL
  `);
}

export {
  deleteOrphanedRevisions,
};
