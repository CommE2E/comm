// @flow

import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
} from 'lib/types/subscription-types';
import type { AccountUpdate, LogOutResponse } from 'lib/types/user-types';
import type { PasswordResetRequest } from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
} from '../updaters/account-updaters';
import { tShape } from '../utils/tcomb-utils';
import { createNewAnonymousCookie, deleteCookie } from '../session/cookies';

const subscriptionUpdateRequestInputValidator = tShape({
  threadID: t.String,
  updatedFields: tShape({
    pushNotifs: t.maybe(t.Boolean),
    home: t.maybe(t.Boolean)
  }),
});

async function userSubscriptionUpdateResponder(
  viewer: Viewer,
  body: any,
): Promise<SubscriptionUpdateResponse> {
  const subscriptionUpdateRequest: SubscriptionUpdateRequest = body;
  if (!subscriptionUpdateRequestInputValidator.is(subscriptionUpdateRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const threadSubscription = await userSubscriptionUpdater(
    viewer,
    subscriptionUpdateRequest,
  );
  return { threadSubscription };
}

const accountUpdateInputValidator = tShape({
  updatedFields: tShape({
    email: t.maybe(t.String),
    password: t.maybe(t.String),
  }),
  currentPassword: t.String,
});

async function accountUpdateResponder(
  viewer: Viewer,
  body: any,
): Promise<void> {
  const accountUpdate: AccountUpdate = body;
  if (!accountUpdateInputValidator.is(accountUpdate)) {
    throw new ServerError('invalid_parameters');
  }

  await accountUpdater(viewer, accountUpdate);
}

async function sendVerificationEmailResponder(
  viewer: Viewer,
  body: any,
): Promise<void> {
  await checkAndSendVerificationEmail(viewer);
}

const resetPasswordRequestInputValidator = tShape({
  usernameOrEmail: t.String,
});

async function sendPasswordResetEmailResponder(
  viewer: Viewer,
  body: any,
): Promise<void> {
  const resetPasswordRequest: PasswordResetRequest = body;
  if (!resetPasswordRequestInputValidator.is(resetPasswordRequest)) {
    throw new ServerError('invalid_parameters');
  }

  await checkAndSendPasswordResetEmail(resetPasswordRequest);
}

async function logOutResponder(
  viewer: Viewer,
  body: any,
): Promise<LogOutResponse> {
  if (viewer.loggedIn) {
    const [ anonymousViewerData ] = await Promise.all([
      createNewAnonymousCookie(),
      deleteCookie(viewer.getData()),
    ]);
    viewer.setNewCookie(anonymousViewerData);
  }
  return {
    currentUserInfo: {
      id: viewer.id,
      anonymous: true,
    },
  };
}

export {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
};
