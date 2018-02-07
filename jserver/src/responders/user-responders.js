// @flow

import type { $Response, $Request } from 'express';
import type { SubscriptionUpdate } from 'lib/types/subscription-types';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updater';
import { connect } from '../database';
import { setCurrentViewerFromCookie } from '../session/cookies';

async function userSubscriptionUpdateResponder(req: $Request, res: $Response) {
  const subscriptionUpdate: SubscriptionUpdate = req.body;

  const conn = await connect();
  await setCurrentViewerFromCookie(conn, req.cookies);
  const threadSubscription = await userSubscriptionUpdater(
    conn,
    subscriptionUpdate,
  );
  conn.end();
  if (!threadSubscription) {
    return { error: 'not_member' };
  }
  return { success: true, threadSubscription };
}

export {
  userSubscriptionUpdateResponder,
};
