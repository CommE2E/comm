// @flow

import type {
  ThreadSubscription,
  SubscriptionUpdateRequest,
} from 'lib/types/subscription-types';

import { ServerError } from 'lib/utils/fetch-utils';

import { currentViewer } from '../session/viewer';
import { pool, SQL } from '../database';

async function userSubscriptionUpdater(
  update: SubscriptionUpdateRequest,
): Promise<ThreadSubscription> {
  const viewer = currentViewer();
  const query = SQL`
    SELECT subscription
    FROM memberships
    WHERE user = ${viewer.id} AND thread = ${update.threadID} AND role != 0
  `;
  const [ result ] = await pool.query(query);
  if (result.length === 0) {
    throw new ServerError('not_member');
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
  await pool.query(saveQuery);

  return newSubscription;
}

export {
  userSubscriptionUpdater,
};
