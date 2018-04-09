// @flow

import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types';
import type { Viewer } from '../session/viewer';
import { threadTypes } from 'lib/types/thread-types';
import { messageTypes } from 'lib/types/message-types';

import bcrypt from 'twin-bcrypt';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import { ServerError } from 'lib/utils/errors';
import ashoat from 'lib/facts/ashoat';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { createNewUserCookie } from '../session/cookies';
import { deleteCookie } from '../deleters/cookie-deleters';
import { sendEmailAddressVerificationEmail } from '../emails/verification';
import createMessages from './message-creator';
import createThread from './thread-creator';

const ashoatMessages = [
  "welcome to SquadCal! thanks for helping to test the alpha.",
  "as you inevitably discover bugs, have feature requests, or design " +
    "suggestions, feel free to message them to me in the app.",
];

async function createAccount(
  viewer: Viewer,
  request: RegisterRequest,
): Promise<RegisterResponse> {
  if (request.password.trim() === "") {
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
  const [ [ usernameResult ], [ emailResult ] ] = await Promise.all([
    dbQuery(usernameQuery),
    dbQuery(emailQuery),
  ]);
  if (usernameResult[0].count !== 0) {
    throw new ServerError('username_taken');
  }
  if (emailResult[0].count !== 0) {
    throw new ServerError('email_taken');
  }

  const hash = bcrypt.hashSync(request.password);
  const time = Date.now();
  const [ id ] = await createIDs("users", 1);
  const newUserRow = [id, request.username, hash, request.email, time];
  const newUserQuery = SQL`
    INSERT INTO users(id, username, hash, email, creation_time)
    VALUES ${[newUserRow]}
  `;
  const [ userViewerData ] = await Promise.all([
    createNewUserCookie(id, 0),
    deleteCookie(viewer.getData().cookieID),
    dbQuery(newUserQuery),
    sendEmailAddressVerificationEmail(
      id,
      request.username,
      request.email,
      true,
    ),
  ]);
  viewer.setNewCookie(userViewerData);

  const [
    personalThreadResult,
    ashoatThreadResult,
  ] = await Promise.all([
    createThread(
      viewer,
      {
        type: threadTypes.CHAT_SECRET,
        name: request.username,
        description: "your personal calendar",
      },
    ),
    createThread(
      viewer,
      {
        type: threadTypes.CHAT_SECRET,
        initialMemberIDs: [ashoat.id],
      },
    ),
  ]);
  let messageTime = Date.now();
  const ashoatMessageDatas = ashoatMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: ashoatThreadResult.newThreadInfo.id,
    creatorID: ashoat.id,
    time: messageTime++,
    text: message,
  }));
  const ashoatMessageInfos = await createMessages(ashoatMessageDatas);
  const rawMessageInfos = [
    ...personalThreadResult.newMessageInfos,
    ...ashoatThreadResult.newMessageInfos,
    ...ashoatMessageInfos,
  ];

  return { id, rawMessageInfos };
}

export default createAccount;
