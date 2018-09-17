// @flow

import type { Viewer } from '../session/viewer';
import type { CalendarQuery } from 'lib/types/entry-types';
import { calendarThreadFilterTypes } from 'lib/types/filter-types';

import _isEqual from 'lodash/fp/isEqual';

import { ServerError } from 'lib/utils/errors';
import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
  filterExists,
} from 'lib/selectors/calendar-filter-selectors';
import { dateString, dateFromString } from 'lib/utils/date-utils';

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

function calendarQueryDifference(
  oldCalendarQuery: CalendarQuery,
  newCalendarQuery: CalendarQuery,
): CalendarQuery[] {
  if (_isEqual(oldCalendarQuery)(newCalendarQuery)) {
    return [];
  }

  const deletedEntriesWereIncluded = filterExists(
    oldCalendarQuery.filters,
    calendarThreadFilterTypes.NOT_DELETED,
  );
  const deletedEntriesAreIncluded = filterExists(
    newCalendarQuery.filters,
    calendarThreadFilterTypes.NOT_DELETED,
  );
  if (!deletedEntriesWereIncluded && deletedEntriesAreIncluded) {
    // The new query includes all deleted entries, but the old one didn't. Since
    // we have no way to include ONLY deleted entries in a CalendarQuery, we
    // can't separate newCalendarQuery into a query for just deleted entries on
    // the old range, and a query for all entries on the full range. We'll have
    // to just query for the whole newCalendarQuery range directly.
    return [ newCalendarQuery ];
  }

  const oldFilteredThreadIDs = filteredThreadIDs(oldCalendarQuery.filters);
  const newFilteredThreadIDs = filteredThreadIDs(newCalendarQuery.filters);
  if (oldFilteredThreadIDs && !newFilteredThreadIDs) {
    // The new query is for all thread IDs, but the old one had a THREAD_LIST.
    // Since we have no way to exclude particular thread IDs from a
    // CalendarQuery, we can't separate newCalendarQuery into a query for just
    // the new thread IDs on the old range, and a query for all the thread IDs
    // on the full range. We'll have to just query for the whole
    // newCalendarQuery range directly.
    return [ newCalendarQuery ];
  }

  const difference = [];
  const oldStartDate = dateFromString(oldCalendarQuery.startDate);
  const oldEndDate = dateFromString(oldCalendarQuery.endDate);
  const newStartDate = dateFromString(newCalendarQuery.startDate);
  const newEndDate = dateFromString(newCalendarQuery.endDate);

  if (
    oldFilteredThreadIDs && newFilteredThreadIDs &&
    // This checks that there exists an intersection at all
    oldStartDate <= newEndDate && oldEndDate >= newStartDate
  ) {
    const newNotInOld =
      [...newFilteredThreadIDs].filter(x => !oldFilteredThreadIDs.has(x));
    if (newNotInOld.length > 0) {
      // In this case, we have added new threadIDs to the THREAD_LIST.
      // We should query the calendar range for these threads.
      const intersectionStartDate = oldStartDate < newStartDate
        ? newCalendarQuery.startDate
        : oldCalendarQuery.startDate;
      const intersectionEndDate = oldEndDate > newEndDate
        ? newCalendarQuery.endDate
        : oldCalendarQuery.endDate;
      difference.push({
        startDate: intersectionStartDate,
        endDate: intersectionEndDate,
        filters: [
          ...nonThreadCalendarFilters(newCalendarQuery.filters),
          {
            type: calendarThreadFilterTypes.THREAD_LIST,
            threadIDs: newNotInOld,
          },
        ],
      });
    }
  }

  if (newStartDate < oldStartDate) {
    const partialEndDate = new Date(oldStartDate.getTime());
    partialEndDate.setDate(partialEndDate.getDate() - 1);
    difference.push({
      filters: newCalendarQuery.filters,
      startDate: newCalendarQuery.startDate,
      endDate: dateString(partialEndDate),
    });
  }
  if (newEndDate > oldEndDate) {
    const partialStartDate = new Date(oldEndDate.getTime());
    partialStartDate.setDate(partialStartDate.getDate() + 1);
    difference.push({
      filters: newCalendarQuery.filters,
      startDate: dateString(partialStartDate),
      endDate: newCalendarQuery.endDate,
    });
  }

  return difference;
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
