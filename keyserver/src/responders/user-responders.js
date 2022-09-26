// @flow

import invariant from 'invariant';
import t from 'tcomb';
import bcrypt from 'twin-bcrypt';

import type {
  ResetPasswordRequest,
  LogOutResponse,
  DeleteAccountRequest,
  RegisterResponse,
  RegisterRequest,
  LogInResponse,
  LogInRequest,
  UpdatePasswordRequest,
  UpdateUserSettingsRequest,
} from 'lib/types/account-types';
import {
  userSettingsTypes,
  notificationTypeValues,
  loginActionSources,
} from 'lib/types/account-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
} from 'lib/types/subscription-types';
import type { PasswordUpdate } from 'lib/types/user-types';
import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';
import { promiseAll } from 'lib/utils/promises';
import {
  tShape,
  tPlatformDetails,
  tPassword,
  tEmail,
  tOldValidUsername,
} from 'lib/utils/validation-utils';

import createAccount from '../creators/account-creator';
import { dbQuery, SQL } from '../database/database';
import { deleteAccount } from '../deleters/account-deleters';
import { deleteCookie } from '../deleters/cookie-deleters';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import {
  fetchKnownUserInfos,
  fetchLoggedInUserInfo,
} from '../fetchers/user-fetchers';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
} from '../session/cookies';
import type { Viewer } from '../session/viewer';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
  updateUserSettings,
} from '../updaters/account-updaters';
import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters';
import { validateInput } from '../utils/validation-utils';
import {
  entryQueryInputValidator,
  newEntryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders';

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
    email: t.maybe(tEmail),
    password: t.maybe(tPassword),
  }),
  currentPassword: tPassword,
});

async function passwordUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: PasswordUpdate = input;
  await validateInput(viewer, accountUpdateInputValidator, request);
  await accountUpdater(viewer, request);
}

async function sendVerificationEmailResponder(viewer: Viewer): Promise<void> {
  await validateInput(viewer, null, null);
  await checkAndSendVerificationEmail(viewer);
}

const resetPasswordRequestInputValidator = tShape({
  usernameOrEmail: t.union([tEmail, tOldValidUsername]),
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
  email: t.maybe(tEmail),
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
  username: t.maybe(t.String),
  usernameOrEmail: t.maybe(t.union([tEmail, tOldValidUsername])),
  password: tPassword,
  watchedIDs: t.list(t.String),
  calendarQuery: t.maybe(entryQueryInputValidator),
  deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
  platformDetails: tPlatformDetails,
  source: t.maybe(t.enums.of(values(loginActionSources))),
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
  const username = request.username ?? request.usernameOrEmail;
  if (!username) {
    throw new ServerError('invalid_parameters');
  }
  const userQuery = SQL`
    SELECT id, hash, username
    FROM users
    WHERE LCASE(username) = LCASE(${username})
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
  for (const watchedThreadID of request.watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const messageSelectionCriteria = { threadCursors, joinedThreads: true };

  const [
    threadsResult,
    messagesResult,
    entriesResult,
    userInfos,
    currentUserInfo,
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchMessageInfos(viewer, messageSelectionCriteria, defaultNumberPerThread),
    calendarQuery ? fetchEntryInfos(viewer, [calendarQuery]) : undefined,
    fetchKnownUserInfos(viewer),
    fetchLoggedInUserInfo(viewer),
  ]);

  const rawEntryInfos = entriesResult ? entriesResult.rawEntryInfos : null;
  const response: LogInResponse = {
    currentUserInfo,
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

async function oldPasswordUpdateResponder(
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

const updateUserSettingsInputValidator = tShape({
  name: t.irreducible(
    userSettingsTypes.DEFAULT_NOTIFICATIONS,
    x => x === userSettingsTypes.DEFAULT_NOTIFICATIONS,
  ),
  data: t.enums.of(notificationTypeValues),
});

async function updateUserSettingsResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
  const request: UpdateUserSettingsRequest = input;
  await validateInput(viewer, updateUserSettingsInputValidator, request);
  return await updateUserSettings(viewer, request);
}

export {
  userSubscriptionUpdateResponder,
  passwordUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
  accountDeletionResponder,
  accountCreationResponder,
  logInResponder,
  oldPasswordUpdateResponder,
  updateUserSettingsResponder,
};
