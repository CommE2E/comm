// @flow

import type {
  RawEntryInfo,
  EntryInfo,
  CalendarQuery,
} from '../types/entry-types';
import type { UserInfo } from '../types/user-types';
import type { RawThreadInfo } from '../types/thread-types';
import {
  calendarThreadFilterTypes,
  defaultCalendarFilters,
} from '../types/filter-types';

import invariant from 'invariant';

import {
  getDate,
  dateFromString,
  fifteenDaysEarlier,
  fifteenDaysLater,
} from '../utils/date-utils';
import {
  filteredThreadIDs,
  filterExists,
} from '../selectors/calendar-filter-selectors';

type HasEntryIDs = { localID?: string, id?: string };
function entryKey(entryInfo: HasEntryIDs): string {
  if (entryInfo.localID) {
    return entryInfo.localID;
  }
  invariant(entryInfo.id, "localID should exist if ID does not");
  return entryInfo.id;
}
function entryID(entryInfo: HasEntryIDs): string {
  if (entryInfo.id) {
    return entryInfo.id;
  }
  invariant(entryInfo.localID, "localID should exist if ID does not");
  return entryInfo.localID;
}

function createEntryInfo(
  rawEntryInfo: RawEntryInfo,
  viewerID: ?string,
  userInfos: {[id: string]: UserInfo},
): EntryInfo {
  const creatorInfo = userInfos[rawEntryInfo.creatorID];
  return {
    id: rawEntryInfo.id,
    localID: rawEntryInfo.localID,
    threadID: rawEntryInfo.threadID,
    text: rawEntryInfo.text,
    year: rawEntryInfo.year,
    month: rawEntryInfo.month,
    day: rawEntryInfo.day,
    creationTime: rawEntryInfo.creationTime,
    creator: creatorInfo && creatorInfo.username,
    deleted: rawEntryInfo.deleted,
  };
}

// Make sure EntryInfo is between startDate and endDate, and that if the
// NOT_DELETED filter is active, the EntryInfo isn't deleted
function rawEntryInfoWithinActiveRange(
  rawEntryInfo: RawEntryInfo,
  calendarQuery: CalendarQuery,
): bool {
  const entryInfoDate = getDate(
    rawEntryInfo.year,
    rawEntryInfo.month,
    rawEntryInfo.day,
  );
  const startDate = dateFromString(calendarQuery.startDate);
  const endDate = dateFromString(calendarQuery.endDate);
  if (entryInfoDate < startDate || entryInfoDate > endDate) {
    return false;
  }

  if (
    rawEntryInfo.deleted &&
    filterExists(calendarQuery.filters, calendarThreadFilterTypes.NOT_DELETED)
  ) {
    return false;
  }

  return true;
}

function rawEntryInfoWithinCalendarQuery(
  rawEntryInfo: RawEntryInfo,
  calendarQuery: CalendarQuery,
): bool {
  if (!rawEntryInfoWithinActiveRange(rawEntryInfo, calendarQuery)) {
    return false;
  }

  const filterToThreadIDs = filteredThreadIDs(calendarQuery.filters);
  if (filterToThreadIDs && !filterToThreadIDs.has(rawEntryInfo.threadID)) {
    return false;
  }

  return true;
}

function defaultCalendarQuery(): CalendarQuery {
  return {
    startDate: fifteenDaysEarlier().valueOf(),
    endDate: fifteenDaysLater().valueOf(),
    filters: defaultCalendarFilters,
  };
}

function usersInRawEntryInfos(
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
): string[] {
  const userIDs = new Set();
  for (let entryInfo of entryInfos) {
    userIDs.add(entryInfo.creatorID);
  }
  return [...userIDs];
}

export {
  entryKey,
  entryID,
  createEntryInfo,
  rawEntryInfoWithinActiveRange,
  rawEntryInfoWithinCalendarQuery,
  defaultCalendarQuery,
  usersInRawEntryInfos,
}
