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
  AccessRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';
import bcrypt from 'twin-bcrypt';
import invariant from 'invariant';

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { values } from 'lib/utils/objects';

import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
} from '../updaters/account-updaters';
import {
  validateInput,
  tShape,
  tPlatformDetails,
  tDeviceType,
  tPassword,
} from '../utils/validation-utils';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
} from '../session/cookies';
import { deleteCookie } from '../deleters/cookie-deleters';
import { deleteAccount } from '../deleters/account-deleters';
import createAccount from '../creators/account-creator';
import {
  entryQueryInputValidator,
  newEntryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';
import { dbQuery, SQL } from '../database';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { sendAccessRequestEmailToAshoat } from '../emails/access-request';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';

const subscriptionUpdateRequestInputValidator = tShape({
  threadID: t.String,
  updatedFields: tShape({
    pushNotifs: t.maybe(t.Boolean),
    home: t.maybe(t.Boolean),
  }),
});

async function userSubscriptionUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<SubscriptionUpdateResponse> {
  const request: SubscriptionUpdateRequest = input;
  await validateInput(viewer, subscriptionUpdateRequestInputValidator, request);
  const threadSubscription = await userSubscriptionUpdater(viewer, request);
  return { threadSubscription };
}

const accountUpdateInputValidator = tShape({
  updatedFields: tShape({
    email: t.maybe(t.String),
    password: t.maybe(tPassword),
  }),
  currentPassword: tPassword,
});

async function accountUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: AccountUpdate = input;
  await validateInput(viewer, accountUpdateInputValidator, request);
  await accountUpdater(viewer, request);
}

async function sendVerificationEmailResponder(viewer: Viewer): Promise<void> {
  await validateInput(viewer, null, null);
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
  await validateInput(viewer, resetPasswordRequestInputValidator, request);
  await checkAndSendPasswordResetEmail(request);
}

async function logOutResponder(viewer: Viewer): Promise<LogOutResponse> {
  await validateInput(viewer, null, null);
  if (viewer.loggedIn) {
    const [anonymousViewerData] = await Promise.all([
      createNewAnonymousCookie({
        platformDetails: viewer.platformDetails,
        deviceToken: viewer.deviceToken,
      }),
      deleteCookie(viewer.cookieID),
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
  password: tPassword,
});

async function accountDeletionResponder(
  viewer: Viewer,
  input: any,
): Promise<LogOutResponse> {
  const request: DeleteAccountRequest = input;
  await validateInput(viewer, deleteAccountRequestInputValidator, request);
  const result = await deleteAccount(viewer, request);
  invariant(result, 'deleteAccount should return result if handed request');
  return result;
}

const deviceTokenUpdateRequestInputValidator = tShape({
  deviceType: t.maybe(t.enums.of(['ios', 'android'])),
  deviceToken: t.String,
});

const registerRequestInputValidator = tShape({
  username: t.String,
  email: t.String,
  password: tPassword,
  calendarQuery: t.maybe(newEntryQueryInputValidator),
  deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
  platformDetails: tPlatformDetails,
});

async function accountCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<RegisterResponse> {
  const request: RegisterRequest = input;
  await validateInput(viewer, registerRequestInputValidator, request);
  return await createAccount(viewer, request);
}

const logInRequestInputValidator = tShape({
  usernameOrEmail: t.String,
  password: tPassword,
  watchedIDs: t.list(t.String),
  calendarQuery: t.maybe(entryQueryInputValidator),
  deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
  platformDetails: tPlatformDetails,
});

async function logInResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  await validateInput(viewer, logInRequestInputValidator, input);
  const request: LogInRequest = input;

  const calendarQuery = request.calendarQuery
    ? normalizeCalendarQuery(request.calendarQuery)
    : null;
  const promises = {};
  if (calendarQuery) {
    promises.verifyCalendarQueryThreadIDs = verifyCalendarQueryThreadIDs(
      calendarQuery,
    );
  }
  const userQuery = SQL`
    SELECT id, hash, username, email, email_verified
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  promises.userQuery = dbQuery(userQuery);
  const {
    userQuery: [userResult],
  } = await promiseAll(promises);

  if (userResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const userRow = userResult[0];
  if (!userRow.hash || !bcrypt.compareSync(request.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }
  const id = userRow.id.toString();

  const newServerTime = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [userViewerData] = await Promise.all([
    createNewUserCookie(id, {
      platformDetails: request.platformDetails,
      deviceToken,
    }),
    deleteCookie(viewer.cookieID),
  ]);
  viewer.setNewCookie(userViewerData);
  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, newServerTime);
  }

  const threadCursors = {};
  for (let watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const threadSelectionCriteria = { threadCursors, joinedThreads: true };

  const [
    threadsResult,
    messagesResult,
    entriesResult,
    userInfos,
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchMessageInfos(viewer, threadSelectionCriteria, defaultNumberPerThread),
    calendarQuery ? fetchEntryInfos(viewer, [calendarQuery]) : undefined,
    fetchKnownUserInfos(viewer),
  ]);

  const rawEntryInfos = entriesResult ? entriesResult.rawEntryInfos : null;
  const response: LogInResponse = {
    currentUserInfo: {
      id,
      username: userRow.username,
      email: userRow.email,
      emailVerified: !!userRow.email_verified,
    },
    rawMessageInfos: messagesResult.rawMessageInfos,
    truncationStatuses: messagesResult.truncationStatuses,
    serverTime: newServerTime,
    userInfos: values(userInfos),
    cookieChange: {
      threadInfos: threadsResult.threadInfos,
      userInfos: [],
    },
  };
  if (rawEntryInfos) {
    response.rawEntryInfos = rawEntryInfos;
  }
  return response;
}

const updatePasswordRequestInputValidator = tShape({
  code: t.String,
  password: tPassword,
  watchedIDs: t.list(t.String),
  calendarQuery: t.maybe(entryQueryInputValidator),
  deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
  platformDetails: tPlatformDetails,
});

async function passwordUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  await validateInput(viewer, updatePasswordRequestInputValidator, input);
  const request: UpdatePasswordRequest = input;
  if (request.calendarQuery) {
    request.calendarQuery = normalizeCalendarQuery(request.calendarQuery);
  }
  return await updatePassword(viewer, request);
}

const accessRequestInputValidator = tShape({
  email: t.String,
  platform: tDeviceType,
});

async function requestAccessResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: AccessRequest = input;
  await validateInput(viewer, accessRequestInputValidator, request);

  await sendAccessRequestEmailToAshoat(request);
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
  requestAccessResponder,
};
