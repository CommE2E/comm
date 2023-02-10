// @flow

import { dbQuery, SQL } from '../database/database.js';

async function deleteOrphanedSessions(): Promise<void> {
  await dbQuery(SQL`
    DELETE s, i, f, up, iup
    FROM sessions s
    LEFT JOIN ids i ON i.id = s.id
    LEFT JOIN focused f ON f.session = s.id
    LEFT JOIN updates up ON up.target = s.id
    LEFT JOIN ids iup ON iup.id = up.id
    LEFT JOIN users u ON u.id = s.user
    LEFT JOIN cookies c ON c.id = s.cookie
    WHERE c.id IS NULL OR u.id IS NULL
  `);
}

const maxWebSessionAge = 3 * 24 * 60 * 60 * 1000;
async function deleteOldWebSessions(): Promise<void> {
  const oldestWebSessionToKeep = Date.now() - maxWebSessionAge;
  await dbQuery(SQL`
    DELETE s, i, f, up, iup
    FROM sessions s
    LEFT JOIN ids i ON i.id = s.id
    LEFT JOIN focused f ON f.session = s.id
    LEFT JOIN updates up ON up.target = s.id
    LEFT JOIN ids iup ON iup.id = up.id
    WHERE s.id != s.cookie
      AND s.last_update < ${oldestWebSessionToKeep}
      AND s.last_validated < ${oldestWebSessionToKeep}
  `);
}

export { deleteOrphanedSessions, deleteOldWebSessions };
