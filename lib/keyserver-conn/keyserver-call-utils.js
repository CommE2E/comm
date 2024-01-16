// @flow

import invariant from 'invariant';

import type { CalendarQuery } from '../types/entry-types.js';
import type { NotDeletedFilter } from '../types/filter-types.js';

function extractKeyserverIDFromID(id: string): string {
  return id.split('|')[0];
}

function sortThreadIDsPerKeyserver(threadIDs: $ReadOnlyArray<string>): {
  +[keyserverID: string]: $ReadOnlyArray<string>,
} {
  const results: { [string]: string[] } = {};
  for (const threadID of threadIDs) {
    const keyserverID = extractKeyserverIDFromID(threadID);
    invariant(keyserverID, 'keyserver data missing from thread id');
    if (results[keyserverID] === undefined) {
      results[keyserverID] = [];
    }
    results[keyserverID].push(threadID);
  }
  return results;
}

type CalendarThreadFilterWithWritableThreadIDs = {
  +type: 'threads',
  +threadIDs: string[],
};
type CalendarFilterWithWritableThreadIDs =
  | NotDeletedFilter
  | CalendarThreadFilterWithWritableThreadIDs;
type CalendarQueryWithWritableFilters = {
  +startDate: string,
  +endDate: string,
  +filters: CalendarFilterWithWritableThreadIDs[],
};
function sortCalendarQueryPerKeyserver(
  calendarQuery: CalendarQuery,
  keyserverIDs: $ReadOnlyArray<string>,
): {
  +[keyserverID: string]: CalendarQuery,
} {
  const { startDate, endDate, filters } = calendarQuery;
  const results: { [string]: CalendarQueryWithWritableFilters } = {};

  for (const keyserverID of keyserverIDs) {
    results[keyserverID] = {
      startDate,
      endDate,
      filters: [],
    };
  }

  for (const filter of filters) {
    if (filter.type === 'not_deleted') {
      for (const keyserverID in results) {
        results[keyserverID].filters.push({ type: 'not_deleted' });
      }
    } else if (filter.type === 'threads') {
      for (const threadID of filter.threadIDs) {
        const keyserverID = extractKeyserverIDFromID(threadID);
        if (results[keyserverID] === undefined) {
          continue;
        }
        let threadFilter = results[keyserverID].filters.find(
          flt => flt.type === 'threads',
        );
        invariant(
          !threadFilter || threadFilter.type === 'threads',
          'should only match CalendarThreadFilter',
        );
        if (!threadFilter) {
          threadFilter = { type: 'threads', threadIDs: [] };
          results[keyserverID].filters.push(threadFilter);
        }

        threadFilter.threadIDs.push(threadID);
      }
    } else {
      console.warn('unhandled filter in sortCalendarQueryPerKeyserver');
    }
  }

  return results;
}

function getThreadIDsForKeyservers(
  threadIDs: $ReadOnlyArray<string>,
  keyserverIDs: $ReadOnlyArray<string>,
): $ReadOnlyArray<string> {
  if (keyserverIDs.length === 0) {
    return [];
  }
  const keyserverIDsSet = new Set<string>(keyserverIDs);
  return threadIDs.filter(threadID =>
    keyserverIDsSet.has(extractKeyserverIDFromID(threadID)),
  );
}

export {
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
  sortCalendarQueryPerKeyserver,
  getThreadIDsForKeyservers,
};
