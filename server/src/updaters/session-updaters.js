// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';

import _isEqual from 'lodash/fp/isEqual';

import { dbQuery, SQL } from '../database';
import { fetchSessionCalendarQuery } from '../fetchers/session-fetchers';
import { createSession } from '../creators/session-creator';

async function updateSessionCalendarQuery(
  viewer: Viewer,
  newCalendarQuery: CalendarQuery,
): Promise<void> {
  const oldCalendarQuery = await fetchSessionCalendarQuery(viewer);
  if (oldCalendarQuery && _isEqual(oldCalendarQuery)(newCalendarQuery)) {
    return;
  }
  await createSession(viewer, newCalendarQuery);
}

export {
  updateSessionCalendarQuery,
};
