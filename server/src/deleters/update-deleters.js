// @flow

import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import {
  dbQuery,
  SQL,
  SQLStatement,
  mergeOrConditions,
} from '../database/database';

async function deleteUpdatesByConditions(
  conditions: $ReadOnlyArray<SQLStatement>,
) {
  invariant(conditions.length > 0, 'no conditions specified');
  const conditionClause = mergeOrConditions(conditions);
  const query = SQL`
    DELETE u, i
    FROM updates u
    LEFT JOIN ids i ON i.id = u.id
    WHERE
  `;
  query.append(conditionClause);
  await dbQuery(query);
}

async function deleteExpiredUpdates(): Promise<void> {
  await dbQuery(SQL`
    DELETE u, i
    FROM updates u
    LEFT JOIN ids i ON i.id = u.id
    LEFT JOIN (
      SELECT u.id AS user,
        COALESCE(MIN(s.last_update), 99999999999999) AS oldest_last_update
      FROM sessions s
      RIGHT JOIN users u ON u.id = s.user
      GROUP BY u.id
    ) o ON o.user = u.user
    WHERE o.user IS NULL OR u.time < o.oldest_last_update
  `);
}

async function deleteUpdatesBeforeTimeTargetingSession(
  viewer: Viewer,
  beforeTime: number,
): Promise<void> {
  const condition = SQL`u.target = ${viewer.session} AND u.time <= ${beforeTime}`;
  await deleteUpdatesByConditions([condition]);
}

export {
  deleteExpiredUpdates,
  deleteUpdatesByConditions,
  deleteUpdatesBeforeTimeTargetingSession,
};
