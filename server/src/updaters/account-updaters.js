// @flow

import type { AccountUpdate } from 'lib/types/user-types';
import type { Viewer } from '../session/viewer';
import type {
  ResetPasswordRequest,
  LogInResponse,
  UpdatePasswordRequest,
} from 'lib/types/account-types';
import { updateTypes } from 'lib/types/update-types';

import bcrypt from 'twin-bcrypt';

import { validEmailRegex } from 'lib/shared/account-utils';
import { promiseAll } from 'lib/utils/promises';
import { ServerError } from 'lib/utils/errors';
import { verifyField } from 'lib/types/verify-types';
import { defaultNumberPerThread } from 'lib/types/message-types';
import { values } from 'lib/utils/objects';

import { dbQuery, SQL } from '../database';
import { sendEmailAddressVerificationEmail } from '../emails/verification';
import { sendPasswordResetEmail } from '../emails/reset-password';
import { verifyCode, clearVerifyCodes } from '../models/verification';
import { createNewUserCookie, setNewSession } from '../session/cookies';
import { fetchMessageInfos } from '../fetchers/message-fetchers';
import { fetchEntryInfos } from '../fetchers/entry-fetchers';
import {
  fetchLoggedInUserInfos,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import { verifyCalendarQueryThreadIDs } from '../responders/entry-responders';
import { createUpdates } from '../creators/update-creator';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';

async function accountUpdater(
  viewer: Viewer,
  update: AccountUpdate,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const email = update.updatedFields.email;
  const newPassword = update.updatedFields.password;

  const fetchPromises = {};
  fetchPromises.currentUserInfos = fetchLoggedInUserInfos([viewer.userID]);
  if (email) {
    if (email.search(validEmailRegex) === -1) {
      throw new ServerError('invalid_email');
    }
    fetchPromises.emailQuery = dbQuery(SQL`
      SELECT COUNT(id) AS count FROM users WHERE email = ${email}
    `);
  }
  fetchPromises.verifyQuery = dbQuery(SQL`
    SELECT username, email, hash FROM users WHERE id = ${viewer.userID}
  `);
  const { verifyQuery, emailQuery, currentUserInfos } = await promiseAll(
    fetchPromises,
  );

  const [verifyResult] = verifyQuery;
  if (verifyResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const verifyRow = verifyResult[0];
  if (!bcrypt.compareSync(update.currentPassword, verifyRow.hash)) {
    throw new ServerError('invalid_credentials');
  }
  if (currentUserInfos.length === 0) {
    throw new ServerError('internal_error');
  }
  const currentUserInfo = currentUserInfos[0];

  const savePromises = [];
  const changedFields = {};
  let currentUserInfoChanged = false;
  if (email && email !== verifyRow.email) {
    const [emailResult] = emailQuery;
    const emailRow = emailResult[0];
    if (emailRow.count !== 0) {
      throw new ServerError('email_taken');
    }

    changedFields.email = email;
    changedFields.email_verified = 0;

    currentUserInfoChanged = true;
    currentUserInfo.email = email;
    currentUserInfo.emailVerified = false;

    savePromises.push(
      sendEmailAddressVerificationEmail(
        viewer.userID,
        verifyRow.username,
        email,
      ),
    );
  }
  if (newPassword) {
    changedFields.hash = bcrypt.hashSync(newPassword);
  }

  if (Object.keys(changedFields).length > 0) {
    savePromises.push(
      dbQuery(SQL`
      UPDATE users SET ${changedFields} WHERE id = ${viewer.userID}
    `),
    );
  }

  await Promise.all(savePromises);

  if (currentUserInfoChanged) {
    const updateDatas = [
      {
        type: updateTypes.UPDATE_CURRENT_USER,
        userID: viewer.userID,
        time: Date.now(),
      },
    ];
    await createUpdates(updateDatas, {
      viewer,
      updatesForCurrentSession: 'broadcast',
    });
  }
}

async function checkAndSendVerificationEmail(viewer: Viewer): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const query = SQL`
    SELECT username, email, email_verified
    FROM users
    WHERE id = ${viewer.userID}
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('internal_error');
  }
  const row = result[0];
  if (row.email_verified) {
    throw new ServerError('already_verified');
  }

  await sendEmailAddressVerificationEmail(
    viewer.userID,
    row.username,
    row.email,
  );
}

async function checkAndSendPasswordResetEmail(request: ResetPasswordRequest) {
  const query = SQL`
    SELECT id, username, email
    FROM users
    WHERE LCASE(username) = LCASE(${request.usernameOrEmail})
      OR LCASE(email) = LCASE(${request.usernameOrEmail})
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_user');
  }
  const row = result[0];

  await sendPasswordResetEmail(row.id.toString(), row.username, row.email);
}

async function updatePassword(
  viewer: Viewer,
  request: UpdatePasswordRequest,
): Promise<LogInResponse> {
  if (request.password.trim() === '') {
    throw new ServerError('empty_password');
  }

  const calendarQuery = request.calendarQuery;
  const promises = {};
  if (calendarQuery) {
    promises.verifyCalendarQueryThreadIDs = verifyCalendarQueryThreadIDs(
      calendarQuery,
    );
  }
  promises.verificationResult = verifyCode(request.code);
  const { verificationResult } = await promiseAll(promises);

  const { userID, field } = verificationResult;
  if (field !== verifyField.RESET_PASSWORD) {
    throw new ServerError('invalid_code');
  }

  const userQuery = SQL`
    SELECT username, email, email_verified FROM users WHERE id = ${userID}
  `;
  const hash = bcrypt.hashSync(request.password);
  const updateQuery = SQL`UPDATE users SET hash = ${hash} WHERE id = ${userID}`;
  const [[userResult]] = await Promise.all([
    dbQuery(userQuery),
    dbQuery(updateQuery),
  ]);
  if (userResult.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const userRow = userResult[0];

  const newServerTime = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [userViewerData] = await Promise.all([
    createNewUserCookie(userID, {
      platformDetails: request.platformDetails,
      deviceToken,
    }),
    clearVerifyCodes(verificationResult),
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
      id: userID,
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

export {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
};
