// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import _isEqual from 'lodash/fp/isEqual';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import { fetchSessionCalendarQuery } from '../fetchers/session-fetchers';

async function updateSessionCalendarQuery(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): Promise<void> {
  const oldCalendarQuery = await fetchSessionCalendarQuery(viewer);
  if (!oldCalendarQuery) {
    throw new ServerError('unknown_error');
  }
  if (_isEqual(oldCalendarQuery)(newCalendarQuery)) {
    return;
  }
  const query = SQL`
    UPDATE sessions
    SET query = ${JSON.stringify(newCalendarQuery)}, time = ${Date.now()}
    WHERE id = ${viewer.session}
  `;
  await dbQuery(query);
}

export {
  updateSessionCalendarQuery,
};
