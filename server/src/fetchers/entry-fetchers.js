// @flow

import type {
  CalendarQuery,
  FetchEntryInfosResponse,
} from 'lib/types/entry-types';
import type { HistoryRevisionInfo } from 'lib/types/history-types';
import type { ThreadPermission } from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import {
  threadPermissions,
  visibilityRules,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import { permissionHelper } from 'lib/permissions/thread-permissions';
import { ServerError } from 'lib/utils/fetch-utils';

import { pool, SQL } from '../database';

async function fetchEntryInfos(
  viewer: Viewer,
  entryQuery: CalendarQuery,
): Promise<FetchEntryInfosResponse> {
  const navCondition = entryQuery.navID === "home"
    ? SQL`AND m.role != 0 `
    : SQL`AND d.thread = ${entryQuery.navID} `;
  const deletedCondition = entryQuery.includeDeleted
    ? SQL`AND e.deleted = 0 `
    : null;
  const viewerID = viewer.id;
  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
      e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
      e.deleted, e.creator AS creatorID, u.username AS creator
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN threads t ON t.id = d.thread
    LEFT JOIN memberships m ON m.thread = d.thread AND m.user = ${viewerID}
    LEFT JOIN users u ON u.id = e.creator
    WHERE
      (
        JSON_EXTRACT(m.permissions, ${visPermissionExtractString}) IS TRUE
        OR t.visibility_rules = ${visibilityRules.OPEN}
      )
      AND d.date BETWEEN ${entryQuery.startDate} AND ${entryQuery.endDate}
  `;
  query.append(navCondition);
  if (deletedCondition) {
    query.append(deletedCondition);
  }
  query.append(SQL`ORDER BY e.creation_time DESC`);
  const [ result ] = await pool.query(query);

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
    SELECT m.permissions, t.visibility_rules
    FROM entries e
    LEFT JOIN days d ON d.id = e.day
    LEFT JOIN threads t ON t.id = d.thread
    LEFT JOIN memberships m ON m.thread = t.id AND m.user = ${viewerID}
    WHERE e.id = ${entryID}
  `;
  const [ result ] = await pool.query(query);

  if (result.length === 0) {
    return false;
  }
  const row = result[0];
  if (row.visibility_rules === null) {
    return false;
  }
  const permissionsInfo = {
    permissions: row.permissions,
    visibilityRules: assertVisibilityRules(row.visibility_rules),
  };
  return permissionHelper(permissionsInfo, permission);
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
  const [ result ] = await pool.query(query);

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

export {
  fetchEntryInfos,
  checkThreadPermissionForEntry,
  fetchEntryRevisionInfo,
};
