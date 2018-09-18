// @flow

import type {
  CalendarQuery,
  FetchEntryInfosResponse,
  RawEntryInfo,
} from 'lib/types/entry-types';
import type { HistoryRevisionInfo } from 'lib/types/history-types';
import type { Viewer } from '../session/viewer';
import {
  threadPermissions,
  type ThreadPermission,
} from 'lib/types/thread-types';
import { calendarThreadFilterTypes } from 'lib/types/filter-types';

import invariant from 'invariant';

import { permissionLookup } from 'lib/permissions/thread-permissions';
import { ServerError } from 'lib/utils/errors';
import {
  filteredThreadIDs,
  filterExists,
} from 'lib/selectors/calendar-filter-selectors';
import { rawEntryInfoWithinCalendarQuery } from 'lib/shared/entry-utils';

import {
  dbQuery,
  SQL,
  SQLStatement,
  mergeAndConditions,
  mergeOrConditions,
} from '../database';

async function fetchEntryInfo(
  viewer: Viewer,
  entryID: string,
): Promise<?RawEntryInfo> {
  const results = await fetchEntryInfosByID(viewer, [ entryID ]);
  if (results.length === 0) {
    return null;
  }
  return results[0];
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
  const [ result ] = await dbQuery(query);
  return result.map(row => ({
    id: row.id.toString(),
    threadID: row.threadID.toString(),
    text: row.text,
    year: row.year,
    month: row.month,
    day: row.day,
    creationTime: row.creationTime,
    creatorID: row.creatorID.toString(),
    deleted: !!row.deleted,
  }));
}

function sqlConditionForCalendarQuery(
  calendarQuery: CalendarQuery,
): ?SQLStatement {
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
    conditions.push(SQL`m.role != 0`);
  }

  if (filterExists(filters, calendarThreadFilterTypes.NOT_DELETED)) {
    conditions.push(SQL`e.deleted = 0`);
  }

  return mergeAndConditions(conditions);
}

async function fetchEntryInfos(
  viewer: Viewer,
  calendarQueries: $ReadOnlyArray<CalendarQuery>,
): Promise<FetchEntryInfosResponse> {
  const queryConditions = calendarQueries
    .map(sqlConditionForCalendarQuery)
    .filter(condition => condition);
  if (queryConditions.length === 0) {
    return { rawEntryInfos: [], userInfos: {} };
  }
  const queryCondition = mergeOrConditions(queryConditions);

  const viewerID = viewer.id;
  const query = SQL`
    SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
      e.deleted, e.creator AS creatorID, u.username AS creator
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN memberships m ON m.thread = d.thread AND m.user = ${viewerID}
    LEFT JOIN users u ON u.id = e.creator
    WHERE JSON_EXTRACT(m.permissions, ${visPermissionExtractString}) IS TRUE AND
  `;
  query.append(queryCondition);
  query.append(SQL`ORDER BY e.creation_time DESC`);
  const [ result ] = await dbQuery(query);

  const rawEntryInfos = [];
  const userInfos = {};
  for (let row of result) {
    const creatorID = row.creatorID.toString();
    rawEntryInfos.push({
      id: row.id.toString(),
      threadID: row.threadID.toString(),
      text: row.text,
      year: row.year,
      month: row.month,
      day: row.day,
      creationTime: row.creationTime,
      creatorID,
      deleted: !!row.deleted,
    });
    if (row.creator) {
      userInfos[creatorID] = {
        id: creatorID,
        username: row.creator,
      };
    }
  }
  return { rawEntryInfos, userInfos };
}

async function checkThreadPermissionForEntry(
  viewer: Viewer,
  entryID: string,
  permission: ThreadPermission,
): Promise<bool> {
  const viewerID = viewer.id;
  const query = SQL`
    SELECT m.permissions, t.id
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN threads t ON t.id = d.thread
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = ${viewerID}
    WHERE e.id = ${entryID}
  `;
  const [ result ] = await dbQuery(query);

  if (result.length === 0) {
    return false;
  }
  const row = result[0];
  if (row.id === null) {
    return false;
  }
  return permissionLookup(row.permissions, permission);
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
    SELECT r.id, u.username AS author, r.text, r.last_update AS lastUpdate,
      r.deleted, d.thread AS threadID, r.entry AS entryID
    FROM revisions r
    LEFT JOIN users u ON u.id = r.author
    LEFT JOIN entries e ON e.id = r.entry
    LEFT JOIN days d ON d.id = e.day
    WHERE r.entry = ${entryID}
    ORDER BY r.last_update DESC
  `;
  const [ result ] = await dbQuery(query);

  const revisions = [];
  for (let row of result) {
    revisions.push({
      id: row.id.toString(),
      author: row.author,
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
): Promise<FetchEntryInfosResponse> {
  const { rawEntryInfos, userInfos } = await fetchEntryInfos(
    viewer,
    calendarQueries,
  );
  const filteredRawEntryInfos = rawEntryInfos.filter(
    rawEntryInfo => !rawEntryInfoWithinCalendarQuery(
      rawEntryInfo,
      oldCalendarQuery,
    ),
  );
  const userIDs = new Set(filteredRawEntryInfos.map(
    rawEntryInfo => rawEntryInfo.creatorID,
  ));
  const filteredUserInfos = {};
  for (let userID in userInfos) {
    if (!userIDs.has(userID)) {
      continue;
    }
    filteredUserInfos[userID] = userInfos[userID];
  }
  return { rawEntryInfos: filteredRawEntryInfos, userInfos: filteredUserInfos };
}

export {
  fetchEntryInfo,
  fetchEntryInfosByID,
  fetchEntryInfos,
  checkThreadPermissionForEntry,
  fetchEntryRevisionInfo,
  fetchEntriesForSession,
};
