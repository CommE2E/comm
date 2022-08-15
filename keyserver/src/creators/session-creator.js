// @flow

import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';

async function createSession(
  viewer: Viewer,
  calendarQuery: CalendarQuery,
  initialLastUpdate: number,
): Promise<void> {
  const time = Date.now();
  const row = [
    viewer.session,
    viewer.userID,
    viewer.cookieID,
    JSON.stringify(calendarQuery),
    time,
    initialLastUpdate,
    time,
  ];
  const query = SQL`
    INSERT INTO sessions (id, user, cookie, query,
      creation_time, last_update, last_validated)
    VALUES ${[row]}
    ON DUPLICATE KEY UPDATE
      query = VALUE(query),
      last_update = VALUE(last_update),
      last_validated = VALUE(last_validated)
  `;
  await dbQuery(query);
  viewer.setSessionInfo({
    lastValidated: time,
    lastUpdate: initialLastUpdate,
    calendarQuery,
  });
}

export { createSession };
