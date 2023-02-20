// @flow

import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';

import {
  filteredThreadIDs,
  nonThreadCalendarFilters,
  filterExists,
} from '../selectors/calendar-filter-selectors.js';
import type {
  RawEntryInfo,
  EntryInfo,
  CalendarQuery,
} from '../types/entry-types.js';
import { calendarThreadFilterTypes } from '../types/filter-types.js';
import type { UserInfos } from '../types/user-types.js';
import { dateString, getDate, dateFromString } from '../utils/date-utils.js';

type HasEntryIDs = { localID?: string, id?: string, ... };
function entryKey(entryInfo: HasEntryIDs): string {
  if (entryInfo.localID) {
    return entryInfo.localID;
  }
  invariant(entryInfo.id, 'localID should exist if ID does not');
  return entryInfo.id;
}
function entryID(entryInfo: HasEntryIDs): string {
  if (entryInfo.id) {
    return entryInfo.id;
  }
  invariant(entryInfo.localID, 'localID should exist if ID does not');
  return entryInfo.localID;
}

function createEntryInfo(
  rawEntryInfo: RawEntryInfo,
  viewerID: ?string,
  userInfos: UserInfos,
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
    creator: creatorInfo,
    deleted: rawEntryInfo.deleted,
  };
}

// Make sure EntryInfo is between startDate and endDate, and that if the
// NOT_DELETED filter is active, the EntryInfo isn't deleted
function rawEntryInfoWithinActiveRange(
  rawEntryInfo: RawEntryInfo,
  calendarQuery: CalendarQuery,
): boolean {
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
): boolean {
  if (!rawEntryInfoWithinActiveRange(rawEntryInfo, calendarQuery)) {
    return false;
  }

  const filterToThreadIDs = filteredThreadIDs(calendarQuery.filters);
  if (filterToThreadIDs && !filterToThreadIDs.has(rawEntryInfo.threadID)) {
    return false;
  }

  return true;
}

function filterRawEntryInfosByCalendarQuery(
  rawEntryInfos: { +[id: string]: RawEntryInfo },
  calendarQuery: CalendarQuery,
): { +[id: string]: RawEntryInfo } {
  let filtered = false;
  const filteredRawEntryInfos = {};
  for (const id in rawEntryInfos) {
    const rawEntryInfo = rawEntryInfos[id];
    if (!rawEntryInfoWithinCalendarQuery(rawEntryInfo, calendarQuery)) {
      filtered = true;
      continue;
    }
    filteredRawEntryInfos[id] = rawEntryInfo;
  }
  return filtered ? filteredRawEntryInfos : rawEntryInfos;
}

function usersInRawEntryInfos(
  entryInfos: $ReadOnlyArray<RawEntryInfo>,
): string[] {
  const userIDs = new Set();
  for (const entryInfo of entryInfos) {
    userIDs.add(entryInfo.creatorID);
  }
  return [...userIDs];
}

// Note: fetchEntriesForSession expects that all of the CalendarQueries in the
// resultant array either filter deleted entries or don't
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
    return [newCalendarQuery];
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
    return [newCalendarQuery];
  }

  const difference = [];
  const oldStartDate = dateFromString(oldCalendarQuery.startDate);
  const oldEndDate = dateFromString(oldCalendarQuery.endDate);
  const newStartDate = dateFromString(newCalendarQuery.startDate);
  const newEndDate = dateFromString(newCalendarQuery.endDate);

  if (
    oldFilteredThreadIDs &&
    newFilteredThreadIDs &&
    // This checks that there exists an intersection at all
    oldStartDate <= newEndDate &&
    oldEndDate >= newStartDate
  ) {
    const newNotInOld = [...newFilteredThreadIDs].filter(
      x => !oldFilteredThreadIDs.has(x),
    );
    if (newNotInOld.length > 0) {
      // In this case, we have added new threadIDs to the THREAD_LIST.
      // We should query the calendar range for these threads.
      const intersectionStartDate =
        oldStartDate < newStartDate
          ? newCalendarQuery.startDate
          : oldCalendarQuery.startDate;
      const intersectionEndDate =
        oldEndDate > newEndDate
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

function serverEntryInfo(rawEntryInfo: RawEntryInfo): ?RawEntryInfo {
  const { id } = rawEntryInfo;
  if (!id) {
    return null;
  }
  const { localID, ...rest } = rawEntryInfo;
  return { ...rest }; // we only do this for Flow
}

function serverEntryInfosObject(array: $ReadOnlyArray<RawEntryInfo>): {
  +[id: string]: RawEntryInfo,
} {
  const obj = {};
  for (const rawEntryInfo of array) {
    const entryInfo = serverEntryInfo(rawEntryInfo);
    if (!entryInfo) {
      continue;
    }
    const { id } = entryInfo;
    invariant(id, 'should be set');
    obj[id] = entryInfo;
  }
  return obj;
}

export {
  entryKey,
  entryID,
  createEntryInfo,
  rawEntryInfoWithinActiveRange,
  rawEntryInfoWithinCalendarQuery,
  filterRawEntryInfosByCalendarQuery,
  usersInRawEntryInfos,
  calendarQueryDifference,
  serverEntryInfo,
  serverEntryInfosObject,
};
