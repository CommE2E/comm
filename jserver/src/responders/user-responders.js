// @flow

import type { $Response, $Request } from 'express';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
} from 'lib/types/subscription-types';
import type { AccountUpdate } from 'lib/types/user-types';
import type { PasswordResetRequest } from 'lib/types/account-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
} from '../updaters/account-updaters';
import { tShape } from '../utils/tcomb-utils';
import { currentViewer } from '../session/viewer';

const subscriptionUpdateRequestInputValidator = tShape({
  threadID: t.String,
  updatedFields: tShape({
    pushNotifs: t.maybe(t.Boolean),
    home: t.maybe(t.Boolean)
  }),
});

async function userSubscriptionUpdateResponder(
  req: $Request,
  res: $Response,
): Promise<SubscriptionUpdateResponse> {
  const subscriptionUpdateRequest: SubscriptionUpdateRequest = (req.body: any);
  if (!subscriptionUpdateRequestInputValidator.is(subscriptionUpdateRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const threadSubscription = await userSubscriptionUpdater(
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
  req: $Request,
  res: $Response,
): Promise<void> {
  const accountUpdate: AccountUpdate = (req.body: any);
  if (!accountUpdateInputValidator.is(accountUpdate)) {
    throw new ServerError('invalid_parameters');
  }

  await accountUpdater(accountUpdate);
}

async function sendVerificationEmailResponder(
  req: $Request,
  res: $Response,
): Promise<void> {
  await checkAndSendVerificationEmail();
}

const resetPasswordRequestInputValidator = tShape({
  usernameOrEmail: t.String,
});

async function sendPasswordResetEmailResponder(
  req: $Request,
  res: $Response,
): Promise<void> {
  const resetPasswordRequest: PasswordResetRequest = (req.body: any);
  if (!resetPasswordRequestInputValidator.is(resetPasswordRequest)) {
    throw new ServerError('invalid_parameters');
  }

  await checkAndSendPasswordResetEmail(resetPasswordRequest);
}

export {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
};
