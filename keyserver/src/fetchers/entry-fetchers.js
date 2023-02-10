// @flow

import invariant from 'invariant';

import { permissionLookup } from 'lib/permissions/thread-permissions.js';
import {
  filteredThreadIDs,
  filterExists,
  nonExcludeDeletedCalendarFilters,
} from 'lib/selectors/calendar-filter-selectors.js';
import { rawEntryInfoWithinCalendarQuery } from 'lib/shared/entry-utils.js';
import type {
  CalendarQuery,
  FetchEntryInfosBase,
  DeltaEntryInfosResponse,
  RawEntryInfo,
} from 'lib/types/entry-types.js';
import { calendarThreadFilterTypes } from 'lib/types/filter-types.js';
import type { HistoryRevisionInfo } from 'lib/types/history-types.js';
import {
  threadPermissions,
  type ThreadPermission,
} from 'lib/types/thread-types.js';
import { dateString } from 'lib/utils/date-utils.js';
import { ServerError } from 'lib/utils/errors.js';

import {
  dbQuery,
  SQL,
  mergeAndConditions,
  mergeOrConditions,
} from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import type { Viewer } from '../session/viewer.js';
import { creationString } from '../utils/idempotent.js';
import { checkIfThreadIsBlocked } from './thread-permission-fetchers.js';

async function fetchEntryInfo(
  viewer: Viewer,
  entryID: string,
): Promise<?RawEntryInfo> {
  const results = await fetchEntryInfosByID(viewer, [entryID]);
  if (results.length === 0) {
    return null;
  }
  return results[0];
}

function rawEntryInfoFromRow(row: Object): RawEntryInfo {
  return {
    id: row.id.toString(),
    threadID: row.threadID.toString(),
    text: row.text,
    year: row.year,
    month: row.month,
    day: row.day,
    creationTime: row.creationTime,
    creatorID: row.creatorID.toString(),
    deleted: !!row.deleted,
  };
}

const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
async function fetchEntryInfosByID(
  viewer: Viewer,
  entryIDs: $ReadOnlyArray<string>,
): Promise<RawEntryInfo[]> {
  if (entryIDs.length === 0) {
    return [];
  }
  const viewerID = viewer.id;
  const query = SQL`
    SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
      e.deleted, e.creator AS creatorID
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN memberships m ON m.thread = d.thread AND m.user = ${viewerID}
    WHERE e.id IN (${entryIDs}) AND
      JSON_EXTRACT(m.permissions, ${visPermissionExtractString}) IS TRUE
  `;
  const [result] = await dbQuery(query);
  return result.map(rawEntryInfoFromRow);
}

function sqlConditionForCalendarQuery(
  calendarQuery: CalendarQuery,
): ?SQLStatementType {
  const { filters, startDate, endDate } = calendarQuery;
  const conditions = [];

  conditions.push(SQL`d.date BETWEEN ${startDate} AND ${endDate}`);

  const filterToThreadIDs = filteredThreadIDs(filters);
  if (filterToThreadIDs && filterToThreadIDs.size > 0) {
    conditions.push(SQL`d.thread IN (${[...filterToThreadIDs]})`);
  } else if (filterToThreadIDs) {
    // Filter to empty set means the result is empty
    return null;
  } else {
    conditions.push(SQL`m.role > 0`);
  }

  if (filterExists(filters, calendarThreadFilterTypes.NOT_DELETED)) {
    conditions.push(SQL`e.deleted = 0`);
  }

  return mergeAndConditions(conditions);
}

async function fetchEntryInfos(
  viewer: Viewer,
  calendarQueries: $ReadOnlyArray<CalendarQuery>,
): Promise<FetchEntryInfosBase> {
  const queryConditions = calendarQueries
    .map(sqlConditionForCalendarQuery)
    .filter(Boolean);
  if (queryConditions.length === 0) {
    return { rawEntryInfos: [] };
  }
  const queryCondition = mergeOrConditions(queryConditions);

  const viewerID = viewer.id;
  const query = SQL`
    SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
      e.deleted, e.creator AS creatorID
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN memberships m ON m.thread = d.thread AND m.user = ${viewerID}
    WHERE JSON_EXTRACT(m.permissions, ${visPermissionExtractString}) IS TRUE AND
  `;
  query.append(queryCondition);
  query.append(SQL`ORDER BY e.creation_time DESC`);
  const [result] = await dbQuery(query);

  const rawEntryInfos = [];
  for (const row of result) {
    rawEntryInfos.push(rawEntryInfoFromRow(row));
  }
  return { rawEntryInfos };
}

async function checkThreadPermissionForEntry(
  viewer: Viewer,
  entryID: string,
  permission: ThreadPermission,
): Promise<boolean> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT m.permissions, t.id
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN threads t ON t.id = d.thread
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = ${viewerID}
    WHERE e.id = ${entryID}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    return false;
  }
  const row = result[0];
  if (row.id === null) {
    return false;
  }
  const threadIsBlocked = await checkIfThreadIsBlocked(
    viewer,
    row.id.toString(),
    permission,
  );
  if (threadIsBlocked) {
    return false;
  }

  const permissions = JSON.parse(row.permissions);
  return permissionLookup(permissions, permission);
}

async function fetchEntryRevisionInfo(
  viewer: Viewer,
  entryID: string,
): Promise<$ReadOnlyArray<HistoryRevisionInfo>> {
  const hasPermission = await checkThreadPermissionForEntry(
    viewer,
    entryID,
    threadPermissions.VISIBLE,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT r.id, r.author AS authorID, r.text, r.last_update AS lastUpdate,
      r.deleted, d.thread AS threadID, r.entry AS entryID
    FROM revisions r
    LEFT JOIN entries e ON e.id = r.entry
    LEFT JOIN days d ON d.id = e.day
    WHERE r.entry = ${entryID}
    ORDER BY r.last_update DESC
  `;
  const [result] = await dbQuery(query);

  const revisions = [];
  for (const row of result) {
    revisions.push({
      id: row.id.toString(),
      authorID: row.authorID.toString(),
      text: row.text,
      lastUpdate: row.lastUpdate,
      deleted: !!row.deleted,
      threadID: row.threadID.toString(),
      entryID: row.entryID.toString(),
    });
  }
  return revisions;
}

// calendarQueries are the "difference" queries we get from subtracting the old
// CalendarQuery from the new one. See calendarQueryDifference.
// oldCalendarQuery is the old CalendarQuery. We make sure none of the returned
// RawEntryInfos match the old CalendarQuery, so that only the difference is
// returned.
async function fetchEntriesForSession(
  viewer: Viewer,
  calendarQueries: $ReadOnlyArray<CalendarQuery>,
  oldCalendarQuery: CalendarQuery,
): Promise<DeltaEntryInfosResponse> {
  // If we're not including deleted entries, we will try and set deletedEntryIDs
  // so that the client can catch possibly stale deleted entryInfos
  let filterDeleted = null;
  for (const calendarQuery of calendarQueries) {
    const notDeletedFilterExists = filterExists(
      calendarQuery.filters,
      calendarThreadFilterTypes.NOT_DELETED,
    );
    if (filterDeleted === null) {
      filterDeleted = notDeletedFilterExists;
    } else {
      invariant(
        filterDeleted === notDeletedFilterExists,
        'one of the CalendarQueries returned by calendarQueryDifference has ' +
          'a NOT_DELETED filter but another does not: ' +
          JSON.stringify(calendarQueries),
      );
    }
  }

  let calendarQueriesForFetch = calendarQueries;
  if (filterDeleted) {
    // Because in the filterDeleted case we still need the deleted RawEntryInfos
    // in order to construct deletedEntryIDs, we get rid of the NOT_DELETED
    // filters before passing the CalendarQueries to fetchEntryInfos. We will
    // filter out the deleted RawEntryInfos in a later step.
    calendarQueriesForFetch = calendarQueriesForFetch.map(calendarQuery => ({
      ...calendarQuery,
      filters: nonExcludeDeletedCalendarFilters(calendarQuery.filters),
    }));
  }

  const { rawEntryInfos } = await fetchEntryInfos(
    viewer,
    calendarQueriesForFetch,
  );
  const entryInfosNotInOldQuery = rawEntryInfos.filter(
    rawEntryInfo =>
      !rawEntryInfoWithinCalendarQuery(rawEntryInfo, oldCalendarQuery),
  );
  let filteredRawEntryInfos = entryInfosNotInOldQuery;
  let deletedEntryIDs = [];
  if (filterDeleted) {
    filteredRawEntryInfos = entryInfosNotInOldQuery.filter(
      rawEntryInfo => !rawEntryInfo.deleted,
    );
    deletedEntryIDs = entryInfosNotInOldQuery
      .filter(rawEntryInfo => rawEntryInfo.deleted)
      .map(rawEntryInfo => {
        const { id } = rawEntryInfo;
        invariant(
          id !== null && id !== undefined,
          'serverID should be set in fetchEntryInfos result',
        );
        return id;
      });
  }

  return {
    rawEntryInfos: filteredRawEntryInfos,
    deletedEntryIDs,
  };
}

async function fetchEntryInfoForLocalID(
  viewer: Viewer,
  localID: ?string,
): Promise<?RawEntryInfo> {
  if (!localID || !viewer.hasSessionInfo) {
    return null;
  }
  const creation = creationString(viewer, localID);
  const viewerID = viewer.id;
  const query = SQL`
    SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
      e.deleted, e.creator AS creatorID
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN memberships m ON m.thread = d.thread AND m.user = ${viewerID}
    WHERE e.creator = ${viewerID} AND e.creation = ${creation} AND
      JSON_EXTRACT(m.permissions, ${visPermissionExtractString}) IS TRUE
  `;

  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return null;
  }
  return rawEntryInfoFromRow(result[0]);
}

function getSunday(weeksFromLastSunday: number) {
  const date = new Date();
  const today = date.getDate();
  const currentDay = date.getDay();
  const newDate = date.setDate(today - currentDay + 7 * weeksFromLastSunday);
  return new Date(newDate);
}

async function fetchEntryInfosForThreadThisWeek(
  viewer: Viewer,
  threadID: string,
): Promise<$ReadOnlyArray<RawEntryInfo>> {
  const startDate = dateString(getSunday(0));
  const endDate = dateString(getSunday(1));
  const filters = [
    { type: 'not_deleted' },
    { type: 'threads', threadIDs: [threadID] },
  ];
  const { rawEntryInfos } = await fetchEntryInfos(viewer, [
    { startDate, endDate, filters },
  ]);
  return rawEntryInfos;
}

export {
  fetchEntryInfo,
  fetchEntryInfosByID,
  fetchEntryInfos,
  checkThreadPermissionForEntry,
  fetchEntryRevisionInfo,
  fetchEntriesForSession,
  fetchEntryInfoForLocalID,
  fetchEntryInfosForThreadThisWeek,
};
