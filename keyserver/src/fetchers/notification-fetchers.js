// @flow

import { threadSubscriptions } from 'lib/types/subscription-types';
import { threadPermissions } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import type { SQLStatementType } from '../database/types';

type UnreadNotifsResult = {
  +id: string,
  +user: string,
  +thread: string,
  +message: string,
  +delivery: string,
  +collapseKey: string,
  +unreadCount: number,
};

async function fetchUnreadNotifs(
  notifCondition: SQLStatementType,
  inputCountCondition?: SQLStatementType,
): Promise<$ReadOnlyArray<UnreadNotifsResult>> {
  const notificationExtractString = `$.${threadSubscriptions.home}`;
  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;

  const query = SQL`
    SELECT n.id, n.user, n.thread, n.message, n.delivery,
      n.collapse_key AS collapseKey, COUNT(
  `;
  query.append(inputCountCondition ? inputCountCondition : SQL`m.thread`);
  query.append(SQL`
      ) AS unreadCount
    FROM notifications n
    LEFT JOIN memberships m ON m.user = n.user 
      AND m.last_message > m.last_read_message 
      AND m.role > 0 
      AND JSON_EXTRACT(subscription, ${notificationExtractString})
      AND JSON_EXTRACT(permissions, ${visPermissionExtractString})
    WHERE n.rescinded = 0 AND
  `);
  query.append(notifCondition);
  query.append(SQL` GROUP BY n.id, m.user`);

  const [result] = await dbQuery(query);
  return result;
}

export { fetchUnreadNotifs };
