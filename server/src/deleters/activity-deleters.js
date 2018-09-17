// @flow

import { earliestTimeConsideredExpired } from 'lib/shared/ping-utils';

import { dbQuery, SQL } from '../database';

async function deleteOrphanedFocused(): Promise<void> {
  const time = earliestTimeConsideredExpired();
  await dbQuery(SQL`
    DELETE f
    FROM focused f
    LEFT JOIN threads t ON t.id = f.thread
    LEFT JOIN users u ON u.id = f.user
    LEFT JOIN sessions s ON s.id = f.session
    WHERE t.id IS NULL OR u.id IS NULL OR s.id IS NULL OR f.time <= ${time}
  `);
}

export {
  deleteOrphanedFocused,
};
