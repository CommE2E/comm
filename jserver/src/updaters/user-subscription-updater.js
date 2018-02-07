// @flow

import type { Connection } from '../database';
import type {
  ThreadSubscription,
  SubscriptionUpdate,
} from 'lib/types/subscription-types';

import { currentViewer } from '../session/viewer';
import { SQL } from '../database';

async function userSubscriptionUpdater(
  conn: Connection,
  update: SubscriptionUpdate,
): Promise<?ThreadSubscription> {
  const viewer = currentViewer();
  const query = SQL`
    SELECT subscription
    FROM memberships
    WHERE user = ${viewer.id} AND thread = ${update.threadID} AND role != 0
  `;
  const [ result ] = await conn.query(query);
  if (result.length === 0) {
    return null;
  }
  const row = result[0];

  const newSubscription = {
    ...row.subscription,
    ...update.updatedFields,
  };
  const saveQuery = SQL`
    UPDATE memberships
    SET subscription = ${JSON.stringify(newSubscription)}
    WHERE user = ${viewer.id} AND thread = ${update.threadID}
  `;
  await conn.query(saveQuery);

  return newSubscription;
}

export {
  userSubscriptionUpdater,
};
