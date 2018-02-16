// @flow

import type { RawEntryInfo, CalendarQuery } from 'lib/types/entry-types';
import type { AccountUserInfo } from 'lib/types/user-types';

import { threadPermissions, visibilityRules } from 'lib/types/thread-types';

import { pool, SQL } from '../database';
import { currentViewer } from '../session/viewer';

type FetchEntryInfosResult = {|
  rawEntryInfos: RawEntryInfo[],
  userInfos: {[id: string]: AccountUserInfo},
|};

async function fetchEntryInfos(
  entryQuery: CalendarQuery,
): Promise<FetchEntryInfosResult> {
  const navCondition = entryQuery.navID === "home"
    ? SQL`AND m.role != 0 `
    : SQL`AND d.thread = ${entryQuery.navID} `;
  const deletedCondition = entryQuery.includeDeleted
    ? SQL`AND e.deleted = 0 `
    : null;
  const viewerID = currentViewer().id;
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

export {
  fetchEntryInfos,
};
