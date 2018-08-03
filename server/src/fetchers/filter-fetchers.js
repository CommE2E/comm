// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { dbQuery, SQL } from '../database';

// "Filter" here refers to the "filters" table in MySQL, which stores
// CalendarQueries on a per-cookie basis
async function fetchCurrentFilter(
  viewer: Viewer,
): Promise<?CalendarQuery> {
  const query = SQL`
    SELECT query
    FROM filters
    WHERE user = ${viewer.id} AND cookie = ${viewer.cookieID}
  `;
  const [ result ] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  const row = result[0];
  return row.query;
}

type CalendarFilterResult = {|
  userID: string,
  cookieID: string,
  calendarQuery: CalendarQuery,
|};
async function fetchFiltersForThread(
  threadID: string,
): Promise<CalendarFilterResult[]> {
  const query = SQL`
    SELECT m.user, c.id AS cookie, f.query
    FROM memberships m
    LEFT JOIN cookies c ON c.user = m.user
    LEFT JOIN filters f ON f.cookie = c.id
    WHERE m.thread = ${threadID} AND f.query IS NOT NULL
  `;
  const [ result ] = await dbQuery(query);
  const filters = [];
  for (let row of result) {
    filters.push({
      userID: row.user.toString(),
      cookieID: row.cookie.toString(),
      calendarQuery: row.query,
    });
  }
  return filters;
}

export {
  fetchCurrentFilter,
  fetchFiltersForThread,
};
