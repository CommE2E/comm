// @flow

import type { $Response, $Request } from 'express';
import type { SubscriptionUpdate } from 'lib/types/subscription-types';

import t from 'tcomb';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updater';
import { setCurrentViewerFromCookie } from '../session/cookies';

const inputValidator = t.interface(
  {
    threadID: t.String,
    updatedFields: t.interface(
      { pushNotifs: t.maybe(t.Boolean), home: t.maybe(t.Boolean) },
      { strict: true },
    ),
  },
  { strict: true },
);

async function userSubscriptionUpdateResponder(req: $Request, res: $Response) {
  const subscriptionUpdate: SubscriptionUpdate = (req.body: any);
  if (!inputValidator.is(subscriptionUpdate)) {
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const threadSubscription = await userSubscriptionUpdater(subscriptionUpdate);

  if (!threadSubscription) {
    return { error: 'not_member' };
  }
  return { success: true, threadSubscription };
}

export {
  userSubscriptionUpdateResponder,
};
