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

import { ServerError } from 'lib/utils/fetch-utils';
import { promiseAll } from 'lib/utils/promises';
import { defaultNumberPerThread } from 'lib/types/message-types';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
} from '../updaters/account-updaters';
import { tShape } from '../utils/tcomb-utils';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  deleteCookie,
} from '../session/cookies';
import { deleteAccount } from '../deleters/account-deleters';
import createAccount from '../creators/account-creator';
import { entryQueryInputValidator } from './entry-responders';
import { verifyThreadID } from '../fetchers/thread-fetchers';
import { pool, SQL } from '../database';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';

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
  const subscriptionUpdateRequest: SubscriptionUpdateRequest = input;
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
  input: any,
): Promise<void> {
  const accountUpdate: AccountUpdate = input;
  if (!accountUpdateInputValidator.is(accountUpdate)) {
    throw new ServerError('invalid_parameters');
  }

  await accountUpdater(viewer, accountUpdate);
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
  const resetPasswordRequest: ResetPasswordRequest = input;
  if (!resetPasswordRequestInputValidator.is(resetPasswordRequest)) {
    throw new ServerError('invalid_parameters');
  }

  await checkAndSendPasswordResetEmail(resetPasswordRequest);
}

async function logOutResponder(
  viewer: Viewer,
  input: any,
): Promise<LogOutResponse> {
  if (viewer.loggedIn) {
    const [ anonymousViewerData ] = await Promise.all([
      createNewAnonymousCookie(),
      deleteCookie(viewer.getData().cookieID),
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
  const deleteAccountRequest: DeleteAccountRequest = input;
  if (!deleteAccountRequestInputValidator.is(deleteAccountRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await deleteAccount(viewer, deleteAccountRequest);
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
  const registerRequest: RegisterRequest = input;
  if (!registerRequestInputValidator.is(registerRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await createAccount(viewer, registerRequest);
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
  const logInRequest: LogInRequest = input;
  if (!logInRequestInputValidator.is(logInRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const calendarQuery = logInRequest.calendarQuery;
  const promises = {};
  if (calendarQuery && calendarQuery.navID !== "home") {
    promises.validThreadID = verifyThreadID(calendarQuery.navID);
  }
  const userQuery = SQL`
    SELECT id, hash, username, email, email_verified
    FROM users
    WHERE LCASE(username) = LCASE(${logInRequest.usernameOrEmail})
      OR LCASE(email) = LCASE(${logInRequest.usernameOrEmail})
  `;
  promises.userQuery = pool.query(userQuery);
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
  if (!bcrypt.compareSync(logInRequest.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }
  const id = userRow.id.toString();

  const userViewerData = await createNewUserCookie(id);
  viewer.setNewCookie(userViewerData);
  const newPingTime = Date.now();

  const threadCursors = {};
  for (let watchedThreadID of logInRequest.watchedIDs) {
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
  const updatePasswordRequest: UpdatePasswordRequest = input;
  if (!updatePasswordRequestInputValidator.is(updatePasswordRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await updatePassword(viewer, updatePasswordRequest);
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
