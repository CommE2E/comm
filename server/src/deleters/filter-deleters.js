// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFilters(): Promise<void> {
  await dbQuery(SQL`
    DELETE f
    FROM filters f
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN cookies c ON c.id = f.cookie
    WHERE c.id IS NULL OR u.id IS NULL
  `);
}

export {
  deleteOrphanedFilters,
};
