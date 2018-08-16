// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database';

// "Filter" here refers to the "filters" table in MySQL, which stores
// CalendarQueries on a per-session basis
async function createFilter(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
): Promise<void> {
  const row = [
    viewer.id,
    viewer.session,
    JSON.stringify(calendarQuery),
    Date.now(),
  ];
  const query = SQL`
    INSERT INTO filters (user, session, query, time)
    VALUES ${[row]}
    ON DUPLICATE KEY UPDATE query = VALUES(query), time = VALUES(time)
  `;
  await dbQuery(query);
}

export {
  createFilter,
};
