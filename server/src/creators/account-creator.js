// @flow

import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';
import { threadTypes } from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';

import bcrypt from 'twin-bcrypt';
import invariant from 'invariant';

import { validUsernameRegex, validEmailRegex } from 'lib/shared/account-utils';
import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';
import ashoat from 'lib/facts/ashoat';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { createNewUserCookie, setNewSession } from '../session/cookies';
import { deleteCookie } from '../deleters/cookie-deleters';
import { sendEmailAddressVerificationEmail } from '../emails/verification';
import createMessages from './message-creator';
import createThread from './thread-creator';
import { verifyCalendarQueryThreadIDs } from '../responders/entry-responders';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers';

const ashoatMessages = [
  'welcome to SquadCal! thanks for helping to test the alpha.',
  'as you inevitably discover bugs, have feature requests, or design ' +
    'suggestions, feel free to message them to me in the app.',
];

async function createAccount(
  viewer: Viewer,
  request: RegisterRequest,
): Promise<RegisterResponse> {
  if (request.password.trim() === '') {
    throw new ServerError('empty_password');
  }
  if (request.username.search(validUsernameRegex) === -1) {
    throw new ServerError('invalid_username');
  }
  if (request.email.search(validEmailRegex) === -1) {
    throw new ServerError('invalid_email');
  }

  const usernameQuery = SQL`
    SELECT COUNT(id) AS count
    FROM users
    WHERE LCASE(username) = LCASE(${request.username})
  `;
  const emailQuery = SQL`
    SELECT COUNT(id) AS count
    FROM users
    WHERE LCASE(email) = LCASE(${request.email})
  `;
  const promises = [dbQuery(usernameQuery), dbQuery(emailQuery)];
  const { calendarQuery } = request;
  if (calendarQuery) {
    promises.push(verifyCalendarQueryThreadIDs(calendarQuery));
  }
  const [[usernameResult], [emailResult]] = await Promise.all(promises);
  if (usernameResult[0].count !== 0) {
    throw new ServerError('username_taken');
  }
  if (emailResult[0].count !== 0) {
    throw new ServerError('email_taken');
  }

  const hash = bcrypt.hashSync(request.password);
  const time = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [id] = await createIDs('users', 1);
  const newUserRow = [id, request.username, hash, request.email, time];
  const newUserQuery = SQL`
    INSERT INTO users(id, username, hash, email, creation_time)
    VALUES ${[newUserRow]}
  `;
  const [userViewerData] = await Promise.all([
    createNewUserCookie(id, {
      platformDetails: request.platformDetails,
      deviceToken,
    }),
    deleteCookie(viewer.cookieID),
    dbQuery(newUserQuery),
    sendEmailAddressVerificationEmail(
      id,
      request.username,
      request.email,
      true,
    ),
  ]);
  viewer.setNewCookie(userViewerData);
  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, 0);
  }

  const [personalThreadResult, ashoatThreadResult] = await Promise.all([
    createThread(
      viewer,
      {
        type: threadTypes.CHAT_SECRET,
        name: request.username,
        description: 'your personal calendar',
      },
      true,
    ),
    createThread(
      viewer,
      {
        type: threadTypes.CHAT_SECRET,
        initialMemberIDs: [ashoat.id],
      },
      true,
    ),
  ]);
  const ashoatThreadID = ashoatThreadResult.newThreadInfo
    ? ashoatThreadResult.newThreadInfo.id
    : ashoatThreadResult.newThreadID;
  invariant(
    ashoatThreadID,
    'createThread should return either newThreadInfo or newThreadID',
  );

  let messageTime = Date.now();
  const ashoatMessageDatas = ashoatMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: ashoatThreadID,
    creatorID: ashoat.id,
    time: messageTime++,
    text: message,
  }));
  const [ashoatMessageInfos, threadsResult, userInfos] = await Promise.all([
    createMessages(viewer, ashoatMessageDatas),
    fetchThreadInfos(viewer),
    fetchKnownUserInfos(viewer),
  ]);
  const rawMessageInfos = [
    ...personalThreadResult.newMessageInfos,
    ...ashoatThreadResult.newMessageInfos,
    ...ashoatMessageInfos,
  ];

  return {
    id,
    rawMessageInfos,
    cookieChange: {
      threadInfos: threadsResult.threadInfos,
      userInfos: values(userInfos),
    },
  };
}

export default createAccount;
