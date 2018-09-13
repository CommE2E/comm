// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database';

async function createSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
): Promise<void> {
  const row = [
    viewer.session,
    viewer.userID,
    viewer.cookieID,
    JSON.stringify(calendarQuery),
    Date.now(),
  ];
  const query = SQL`
    INSERT INTO sessions (id, user, cookie, query, time)
    VALUES ${[row]}
    ON DUPLICATE KEY UPDATE query = VALUES(query), time = VALUES(time)
  `;
  await dbQuery(query);
}

export {
  createSession,
};
