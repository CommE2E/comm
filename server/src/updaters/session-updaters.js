// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import _isEqual from 'lodash/fp/isEqual';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import { fetchSessionCalendarQuery } from '../fetchers/session-fetchers';

type SessionUpdate = $Shape<{|
  query: CalendarQuery,
  lastUpdate: number,
|}>;

// TODO: this function should return the difference between the old and new
// CalendarQueries. pingResponder and calendarQueryUpdateResponder will use this
// info to fetch EntryInfos. In the pingResponder case, if this function throws,
// initializeSession will just fetch the full range of EntryInfos.
async function compareNewCalendarQuery(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): Promise<SessionUpdate> {
  const oldCalendarQuery = await fetchSessionCalendarQuery(viewer);
  if (!oldCalendarQuery) {
    throw new ServerError('unknown_error');
  }
  if (_isEqual(oldCalendarQuery)(newCalendarQuery)) {
    return {};
  }
  return { query: newCalendarQuery };
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
