// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database';

// "Filter" here refers to the "filters" table in MySQL, which stores
// CalendarQueries on a per-session basis
async function fetchSessionCalendarQuery(
  viewer: Viewer,
): Promise<?CalendarQuery> {
  const query = SQL`
    SELECT query
    FROM sessions
    WHERE user = ${viewer.userID} AND id = ${viewer.session}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  return row.query;
}

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
  fetchSessionCalendarQuery,
  fetchActiveSessionsForThread,
};
