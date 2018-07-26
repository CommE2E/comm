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

export {
  fetchCurrentFilter,
};
