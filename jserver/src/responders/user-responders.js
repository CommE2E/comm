// @flow

import type { $Response, $Request } from 'express';
import type { SubscriptionUpdate } from 'lib/types/subscription-types';
import type { AccountUpdate } from 'lib/types/user-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updater';
import {
  accountUpdater,
  resendVerificationEmail,
} from '../updaters/account-updater';
import { setCurrentViewerFromCookie } from '../session/cookies';
import { tShape } from '../utils/tcomb-utils';
import { currentViewer } from '../session/viewer';

const subscriptionUpdateInputValidator = tShape({
  threadID: t.String,
  updatedFields: tShape({
    pushNotifs: t.maybe(t.Boolean),
    home: t.maybe(t.Boolean)
  }),
});

async function userSubscriptionUpdateResponder(req: $Request, res: $Response) {
  const subscriptionUpdate: SubscriptionUpdate = (req.body: any);
  if (!subscriptionUpdateInputValidator.is(subscriptionUpdate)) {
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const threadSubscription = await userSubscriptionUpdater(subscriptionUpdate);

  if (!threadSubscription) {
    return { error: 'not_member' };
  }
  return { success: true, threadSubscription };
}

const accountUpdateInputValidator = tShape({
  updatedFields: tShape({
    email: t.maybe(t.String),
    password: t.maybe(t.String),
  }),
  currentPassword: t.String,
});

async function accountUpdateResponder(req: $Request, res: $Response) {
  const accountUpdate: AccountUpdate = (req.body: any);
  if (!accountUpdateInputValidator.is(accountUpdate)) {
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    return { error: 'not_logged_in' };
  }

  try {
    await accountUpdater(viewer, accountUpdate);
  } catch (e) {
    if (e instanceof ServerError) {
      return { error: e.message };
    } else {
      throw e;
    }
  }

  return { success: true };
}

async function resendVerificationEmailResponder(req: $Request, res: $Response) {
  await setCurrentViewerFromCookie(req.cookies);
  const viewer = currentViewer();
  if (!viewer.loggedIn) {
    return { error: 'not_logged_in' };
  }

  try {
    await resendVerificationEmail(viewer);
  } catch (e) {
    if (e instanceof ServerError) {
      return { error: e.message };
    } else {
      throw e;
    }
  }

  return { success: true };
}

export {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  resendVerificationEmailResponder,
};
