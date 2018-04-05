// @flow

import { dbQuery, SQL } from '../database';

async function deleteExpiredUpdates(): Promise<void> {
  await dbQuery(SQL`
    DELETE u, i
    FROM updates u
    LEFT JOIN ids i ON i.id = u.id
    LEFT JOIN (
      SELECT u.id AS user,
        COALESCE(MIN(c.last_update), 99999999999999) AS oldest_last_update
      FROM cookies c
      RIGHT JOIN users u ON u.id = c.user
      GROUP BY u.id
    ) o ON o.user = u.user
    WHERE u.time < o.oldest_last_update
  `);
}

export {
  deleteExpiredUpdates,
};
