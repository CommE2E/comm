// @flow

import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
} from 'lib/types/subscription-types';
import type { AccountUpdate } from 'lib/types/user-types';
import type {
  ResetPasswordRequest,
  LogOutResponse,
  DeleteAccountRequest,
  RegisterResponse,
  RegisterRequest,
  LogInResponse,
  LogInRequest,
  UpdatePasswordRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';
import bcrypt from 'twin-bcrypt';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { defaultNumberPerThread } from 'lib/types/message-types';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
} from '../updaters/account-updaters';
import { validateInput, tShape } from '../utils/validation-utils';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  deleteCookie,
  deleteCookiesWithDeviceTokens,
} from '../session/cookies';
import { deleteAccount } from '../deleters/account-deleters';
import createAccount from '../creators/account-creator';
import { entryQueryInputValidator } from './entry-responders';
import { verifyThreadID } from '../fetchers/thread-fetchers';
import { dbQuery, SQL } from '../database';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchDeviceTokensForCookie } from '../fetchers/device-token-fetchers';

const subscriptionUpdateRequestInputValidator = tShape({
  threadID: t.String,
  updatedFields: tShape({
    pushNotifs: t.maybe(t.Boolean),
    home: t.maybe(t.Boolean)
  }),
});

async function userSubscriptionUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<SubscriptionUpdateResponse> {
  const request: SubscriptionUpdateRequest = input;
  validateInput(subscriptionUpdateRequestInputValidator, request);
  const threadSubscription = await userSubscriptionUpdater(viewer, request);
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
  input: any,
): Promise<void> {
  const request: AccountUpdate = input;
  validateInput(accountUpdateInputValidator, request);
  await accountUpdater(viewer, request);
}

async function sendVerificationEmailResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  await checkAndSendVerificationEmail(viewer);
}

const resetPasswordRequestInputValidator = tShape({
  usernameOrEmail: t.String,
});

async function sendPasswordResetEmailResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: ResetPasswordRequest = input;
  validateInput(resetPasswordRequestInputValidator, request);
  await checkAndSendPasswordResetEmail(request);
}

async function logOutResponder(
  viewer: Viewer,
  input: any,
): Promise<LogOutResponse> {
  const cookieID = viewer.getData().cookieID;
  if (viewer.loggedIn) {
    const deviceTokens = await fetchDeviceTokensForCookie(cookieID);
    const [ anonymousViewerData ] = await Promise.all([
      createNewAnonymousCookie(),
      deleteCookiesWithDeviceTokens(viewer.userID, deviceTokens),
      // deleteCookiesWithDeviceTokens should delete it, but just in case...
      deleteCookie(cookieID),
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

const deleteAccountRequestInputValidator = tShape({
  password: t.String,
});

async function accountDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LogOutResponse> {
  const request: DeleteAccountRequest = input;
  validateInput(deleteAccountRequestInputValidator, request);
  return await deleteAccount(viewer, request);
}

const registerRequestInputValidator = tShape({
  username: t.String,
  email: t.String,
  password: t.String,
});

async function accountCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<RegisterResponse> {
  const request: RegisterRequest = input;
  validateInput(registerRequestInputValidator, request);
  return await createAccount(viewer, request);
}

const logInRequestInputValidator = tShape({
  usernameOrEmail: t.String,
  password: t.String,
  watchedIDs: t.list(t.String),
  calendarQuery: t.maybe(entryQueryInputValidator),
});

async function logInResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  const request: LogInRequest = input;
  validateInput(logInRequestInputValidator, request);

  const calendarQuery = request.calendarQuery;
  const promises = {};
  if (calendarQuery && calendarQuery.navID !== "home") {
    promises.validThreadID = verifyThreadID(calendarQuery.navID);
  }
  const userQuery = SQL`
    SELECT id, hash, username, email, email_verified
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  promises.userQuery = dbQuery(userQuery);
  const {
    validThreadID,
    userQuery: [ userResult ],
  } = await promiseAll(promises);

  if (validThreadID === false) {
    throw new ServerError('invalid_parameters');
  }
  if (userResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const userRow = userResult[0];
  if (!bcrypt.compareSync(request.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }
  const id = userRow.id.toString();

  const userViewerData = await createNewUserCookie(id);
  viewer.setNewCookie(userViewerData);
  const newPingTime = Date.now();

  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };

  const [ messagesResult, entriesResult ] = await Promise.all([
    fetchMessageInfos(
      viewer,
      threadSelectionCriteria,
      defaultNumberPerThread,
    ),
    calendarQuery ? fetchEntryInfos(viewer, calendarQuery) : undefined,
  ]);

  const rawEntryInfos = entriesResult ? entriesResult.rawEntryInfos : null;
  const userInfos = entriesResult
    ? { ...messagesResult.userInfos, ...entriesResult.userInfos }
    : messagesResult.userInfos;
  const userInfosArray: any = Object.values(userInfos);
  const response: LogInResponse = {
    currentUserInfo: {
      id,
      username: userRow.username,
      email: userRow.email,
      emailVerified: !!userRow.email_verified,
    },
    rawMessageInfos: messagesResult.rawMessageInfos,
    truncationStatuses: messagesResult.truncationStatuses,
    serverTime: newPingTime,
    userInfos: userInfosArray,
  };
  if (rawEntryInfos) {
    response.rawEntryInfos = rawEntryInfos;
  }
  return response;
}

const updatePasswordRequestInputValidator = tShape({
  code: t.String,
  password: t.String,
  watchedIDs: t.list(t.String),
  calendarQuery: t.maybe(entryQueryInputValidator),
});

async function passwordUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  const request: UpdatePasswordRequest = input;
  validateInput(updatePasswordRequestInputValidator, request);
  return await updatePassword(viewer, request);
}

export {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
  accountDeletionResponder,
  accountCreationResponder,
  logInResponder,
  passwordUpdateResponder,
};
