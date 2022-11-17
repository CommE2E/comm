// @flow

import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';

import ashoat from 'lib/facts/ashoat';
import bots from 'lib/facts/bots';
import genesis from 'lib/facts/genesis';
import { policyTypes } from 'lib/facts/policies.js';
import {
  validUsernameRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils';
import { hasMinCodeVersion } from 'lib/shared/version-utils';
import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types';
import { messageTypes } from 'lib/types/message-types';
import { threadTypes } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';
import { reservedUsernamesSet } from 'lib/utils/reserved-users';

import { dbQuery, SQL } from '../database/database';
import { deleteCookie } from '../deleters/cookie-deleters';
import { fetchThreadInfos } from '../fetchers/thread-fetchers';
import {
  fetchLoggedInUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers';
import { verifyCalendarQueryThreadIDs } from '../responders/entry-responders';
import { createNewUserCookie, setNewSession } from '../session/cookies';
import { createScriptViewer } from '../session/scripts';
import type { Viewer } from '../session/viewer';
import { updateThread } from '../updaters/thread-updaters';
import { viewerAcknowledgmentUpdater } from '../updaters/viewer-acknowledgment-updater.js';
import createIDs from './id-creator';
import createMessages from './message-creator';
import {
  createThread,
  createPrivateThread,
  privateThreadDescription,
} from './thread-creator';

const { commbot } = bots;

const ashoatMessages = [
  'welcome to Comm!',
  'as you inevitably discover bugs, have feature requests, or design ' +
    'suggestions, feel free to message them to me in the app.',
];

const privateMessages = [privateThreadDescription];

async function createAccount(
  viewer: Viewer,
  request: RegisterRequest,
): Promise<RegisterResponse> {
  if (request.password.trim() === '') {
    throw new ServerError('empty_password');
  }
  const usernameRegex = hasMinCodeVersion(viewer.platformDetails, 69)
    ? validUsernameRegex
    : oldValidUsernameRegex;
  if (request.username.search(usernameRegex) === -1) {
    throw new ServerError('invalid_username');
  }

  const usernameQuery = SQL`
    SELECT COUNT(id) AS count
    FROM users
    WHERE LCASE(username) = LCASE(${request.username})
  `;
  const promises = [dbQuery(usernameQuery)];
  const { calendarQuery } = request;
  if (calendarQuery) {
    promises.push(verifyCalendarQueryThreadIDs(calendarQuery));
  }

  const [[usernameResult]] = await Promise.all(promises);
  if (reservedUsernamesSet.has(request.username.toLowerCase())) {
    if (hasMinCodeVersion(viewer.platformDetails, 120)) {
      throw new ServerError('username_reserved');
    } else {
      throw new ServerError('username_taken');
    }
  }
  if (usernameResult[0].count !== 0) {
    throw new ServerError('username_taken');
  }

  const hash = bcrypt.hashSync(request.password);
  const time = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [id] = await createIDs('users', 1);
  const newUserRow = [id, request.username, hash, time];
  const newUserQuery = SQL`
    INSERT INTO users(id, username, hash, creation_time)
    VALUES ${[newUserRow]}
  `;
  const [userViewerData] = await Promise.all([
    createNewUserCookie(id, {
      platformDetails: request.platformDetails,
      deviceToken,
    }),
    deleteCookie(viewer.cookieID),
    dbQuery(newUserQuery),
  ]);
  viewer.setNewCookie(userViewerData);

  await viewerAcknowledgmentUpdater(viewer, policyTypes.tosAndPrivacyPolicy);
  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, 0);
  }

  await Promise.all([
    updateThread(
      createScriptViewer(ashoat.id),
      {
        threadID: genesis.id,
        changes: { newMemberIDs: [id] },
      },
      { forceAddMembers: true, silenceMessages: true, ignorePermissions: true },
    ),
    viewerAcknowledgmentUpdater(viewer, policyTypes.tosAndPrivacyPolicy),
  ]);

  const [privateThreadResult, ashoatThreadResult] = await Promise.all([
    createPrivateThread(viewer, request.username),
    createThread(
      viewer,
      {
        type: threadTypes.PERSONAL,
        initialMemberIDs: [ashoat.id],
      },
      { forceAddMembers: true },
    ),
  ]);
  const ashoatThreadID = ashoatThreadResult.newThreadInfo
    ? ashoatThreadResult.newThreadInfo.id
    : ashoatThreadResult.newThreadID;
  const privateThreadID = privateThreadResult.newThreadInfo
    ? privateThreadResult.newThreadInfo.id
    : privateThreadResult.newThreadID;
  invariant(
    ashoatThreadID && privateThreadID,
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
  const privateMessageDatas = privateMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: privateThreadID,
    creatorID: commbot.userID,
    time: messageTime++,
    text: message,
  }));
  const messageDatas = [...ashoatMessageDatas, ...privateMessageDatas];
  const [
    messageInfos,
    threadsResult,
    userInfos,
    currentUserInfo,
  ] = await Promise.all([
    createMessages(viewer, messageDatas),
    fetchThreadInfos(viewer),
    fetchKnownUserInfos(viewer),
    fetchLoggedInUserInfo(viewer),
  ]);
  const rawMessageInfos = [
    ...ashoatThreadResult.newMessageInfos,
    ...privateThreadResult.newMessageInfos,
    ...messageInfos,
  ];

  return {
    id,
    rawMessageInfos,
    currentUserInfo,
    cookieChange: {
      threadInfos: threadsResult.threadInfos,
      userInfos: values(userInfos),
    },
  };
}

export default createAccount;
