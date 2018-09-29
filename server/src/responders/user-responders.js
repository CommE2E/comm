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

import { ServerError } from 'lib/utils/errors';
import { promiseAll } from 'lib/utils/promises';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { values } from 'lib/utils/objects';

import {
  userSubscriptionUpdater,
} from '../updaters/user-subscription-updaters';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
} from '../updaters/account-updaters';
import {
  validateInput,
  tShape,
  tPlatform,
  tPlatformDetails,
  tDeviceType,
  tPassword,
} from '../utils/validation-utils';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
} from '../session/cookies';
import {
  deleteCookie,
  deleteCookiesOnLogOut,
} from '../deleters/cookie-deleters';
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
import { deviceTokenUpdater } from '../updaters/device-token-updaters';
import { deviceTokenUpdateRequestInputValidator } from './device-responders';
import { sendAccessRequestEmailToAshoat } from '../emails/access-request';
import { setNewSession } from '../session/cookies';

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

async function sendVerificationEmailResponder(
  viewer: Viewer,
  input: any,
): Promise<void> {
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

async function logOutResponder(
  viewer: Viewer,
  input: any,
): Promise<LogOutResponse> {
  await validateInput(viewer, null, null);
  if (viewer.loggedIn) {
    const [ anonymousViewerData ] = await Promise.all([
      createNewAnonymousCookie(viewer.platformDetails),
      deleteCookiesOnLogOut(viewer.userID, viewer.cookieID),
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
  return await deleteAccount(viewer, request);
}

const registerRequestInputValidator = tShape({
  username: t.String,
  email: t.String,
  password: tPassword,
  calendarQuery: t.maybe(newEntryQueryInputValidator),
  deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
  platform: t.maybe(tPlatform),
  platformDetails: t.maybe(tPlatformDetails),
});

async function accountCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<RegisterResponse> {
  if (!input.platformDetails && input.platform) {
    input.platformDetails = { platform: input.platform };
    delete input.platform;
  }
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
  platform: t.maybe(tPlatform),
  platformDetails: t.maybe(tPlatformDetails),
});

async function logInResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  await validateInput(viewer, logInRequestInputValidator, input);
  if (!input.platformDetails && input.platform) {
    input.platformDetails = { platform: input.platform };
    delete input.platform;
  }
  const request: LogInRequest = input;

  const calendarQuery = request.calendarQuery
    ? normalizeCalendarQuery(request.calendarQuery)
    : null;
  const promises = {};
  if (calendarQuery) {
    promises.verifyCalendarQueryThreadIDs =
      verifyCalendarQueryThreadIDs(calendarQuery);
  }
  const userQuery = SQL`
    SELECT id, hash, username, email, email_verified
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  promises.userQuery = dbQuery(userQuery);
  const { userQuery: [ userResult ] } = await promiseAll(promises);

  if (userResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const userRow = userResult[0];
  if (!userRow.hash || !bcrypt.compareSync(request.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }
  const id = userRow.id.toString();

  const newPingTime = Date.now();
  const [ userViewerData ] = await Promise.all([
    createNewUserCookie(id, request.platformDetails),
    deleteCookie(viewer.cookieID),
  ]);
  viewer.setNewCookie(userViewerData);
  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, newPingTime);
  }

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
    calendarQuery ? fetchEntryInfos(viewer, [ calendarQuery ]) : undefined,
    request.deviceTokenUpdateRequest
      ? deviceTokenUpdater(viewer, request.deviceTokenUpdateRequest)
      : undefined,
  ]);

  const rawEntryInfos = entriesResult ? entriesResult.rawEntryInfos : null;
  const userInfos = entriesResult
    ? { ...messagesResult.userInfos, ...entriesResult.userInfos }
    : messagesResult.userInfos;
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
    userInfos: values(userInfos),
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
  platform: t.maybe(tPlatform),
  platformDetails: t.maybe(tPlatformDetails),
});

async function passwordUpdateResponder(
  viewer: Viewer,
  input: any,
): Promise<LogInResponse> {
  await validateInput(viewer, updatePasswordRequestInputValidator, input);
  if (!input.platformDetails && input.platform) {
    input.platformDetails = { platform: input.platform };
    delete input.platform;
  }
  const request: UpdatePasswordRequest = input;
  if (request.calendarQuery) {
    request.calendarQuery = normalizeCalendarQuery(request.calendarQuery);
  }
  const response = await updatePassword(viewer, request);

  if (request.deviceTokenUpdateRequest) {
    await deviceTokenUpdater(viewer, request.deviceTokenUpdateRequest);
  }

  return response;
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
