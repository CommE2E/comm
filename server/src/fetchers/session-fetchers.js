// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database';

type CalendarSessionResult = {|
  userID: string,
  session: string,
  calendarQuery: CalendarQuery,
|};
async function fetchActiveSessionsForThread(
  threadID: string,
): Promise<CalendarSessionResult[]> {
  const query = SQL`
    SELECT s.id, s.user, s.query
    FROM memberships m
    LEFT JOIN sessions s ON s.user = m.user
    WHERE m.thread = ${threadID} AND s.query IS NOT NULL
  `;
  const [ result ] = await dbQuery(query);
  const filters = [];
  for (let row of result) {
    filters.push({
      userID: row.user.toString(),
      session: row.id.toString(),
      calendarQuery: row.query,
    });
  }
  return filters;
}

export {
  fetchActiveSessionsForThread,
};
