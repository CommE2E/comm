// @flow

import { dbQuery, SQL } from '../database';

async function deleteOrphanedSessions(): Promise<void> {
  await dbQuery(SQL`
    DELETE s, i
    FROM filters s
    LEFT JOIN ids i ON i.id = s.id
    LEFT JOIN users u ON u.id = s.user
    LEFT JOIN cookies c ON c.id = s.cookie
    WHERE c.id IS NULL OR u.id IS NULL
  `);
}

export {
  deleteOrphanedSessions,
};
