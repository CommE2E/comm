// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import { ServerError } from 'lib/utils/errors';
import { calendarQueryDifference } from 'lib/shared/entry-utils';

import { dbQuery, SQL } from '../database';
import { fetchSessionCalendarQuery } from '../fetchers/session-fetchers';

type SessionUpdate = $Shape<{|
  query: CalendarQuery,
  lastUpdate: number,
|}>;
type CalendarQueryComparisonResult = {|
  difference: $ReadOnlyArray<CalendarQuery>,
  sessionUpdate: SessionUpdate,
|};

async function compareNewCalendarQuery(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): Promise<CalendarQueryComparisonResult> {
  const oldCalendarQuery = await fetchSessionCalendarQuery(viewer);
  if (!oldCalendarQuery) {
    throw new ServerError('unknown_error');
  }
  const difference = calendarQueryDifference(
    oldCalendarQuery,
    newCalendarQuery,
  );
  const sessionUpdate = difference.length > 0
    ? { query: newCalendarQuery }
    : {};
  return { difference, sessionUpdate };
}

async function commitSessionUpdate(
  viewer: Viewer,
  sessionUpdate: SessionUpdate,
): Promise<void> {
  const sqlUpdate = {};
  if (sessionUpdate.query) {
    sqlUpdate.query = JSON.stringify(sessionUpdate.query);
  }
  const { lastUpdate } = sessionUpdate;
  if (lastUpdate !== null && lastUpdate !== undefined) {
    sqlUpdate.last_update = lastUpdate;
  }
  if (Object.keys(sqlUpdate).length === 0) {
    return;
  }
  const query = SQL`
    UPDATE sessions
    SET ${sqlUpdate}
    WHERE id = ${viewer.session}
  `;
  await dbQuery(query);
}

export {
  compareNewCalendarQuery,
  commitSessionUpdate,
};
