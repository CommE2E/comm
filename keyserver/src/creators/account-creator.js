// @flow

import invariant from 'invariant';
import { getRustAPI } from 'rust-node-addon';
import bcrypt from 'twin-bcrypt';

import ashoat from 'lib/facts/ashoat.js';
import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import { policyTypes } from 'lib/facts/policies.js';
import {
  validUsernameRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types.js';
import type {
  SignedIdentityKeysBlob,
  IdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type {
  PlatformDetails,
  DeviceTokenUpdateRequest,
} from 'lib/types/device-types.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import { messageTypes } from 'lib/types/message-types.js';
import type { SIWESocialProof } from 'lib/types/siwe-types.js';
import { threadTypes } from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { reservedUsernamesSet } from 'lib/utils/reserved-users.js';
import { isValidEthereumAddress } from 'lib/utils/siwe-utils.js';

import createIDs from './id-creator.js';
import createMessages from './message-creator.js';
import {
  createThread,
  createPrivateThread,
  privateThreadDescription,
} from './thread-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchLoggedInUserInfo,
  fetchKnownUserInfos,
} from '../fetchers/user-fetchers.js';
import { verifyCalendarQueryThreadIDs } from '../responders/entry-responders.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import { createNewUserCookie, setNewSession } from '../session/cookies.js';
import { createScriptViewer } from '../session/scripts.js';
import type { Viewer } from '../session/viewer.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { viewerAcknowledgmentUpdater } from '../updaters/viewer-acknowledgment-updater.js';

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
  const { calendarQuery, signedIdentityKeysBlob } = request;
  if (calendarQuery) {
    promises.push(verifyCalendarQueryThreadIDs(calendarQuery));
  }

  const [[usernameResult]] = await Promise.all(promises);
  if (
    reservedUsernamesSet.has(request.username.toLowerCase()) ||
    isValidEthereumAddress(request.username.toLowerCase())
  ) {
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
      signedIdentityKeysBlob,
    }),
    deleteCookie(viewer.cookieID),
    dbQuery(newUserQuery),
  ]);
  viewer.setNewCookie(userViewerData);

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
  const [messageInfos, threadsResult, userInfos, currentUserInfo] =
    await Promise.all([
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

  if (signedIdentityKeysBlob) {
    const identityKeys: IdentityKeysBlob = JSON.parse(
      signedIdentityKeysBlob.payload,
    );

    handleAsyncPromise(
      (async () => {
        const rustAPI = await getRustAPI();
        await rustAPI.registerUser(
          id,
          identityKeys.primaryIdentityPublicKeys.ed25519,
          request.username,
          request.password,
          signedIdentityKeysBlob,
        );
      })(),
    );
  }

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

export type ProcessSIWEAccountCreationRequest = {
  +address: string,
  +calendarQuery: CalendarQuery,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +socialProof: SIWESocialProof,
  +signedIdentityKeysBlob?: ?SignedIdentityKeysBlob,
};
// Note: `processSIWEAccountCreation(...)` assumes that the validity of
//       `ProcessSIWEAccountCreationRequest` was checked at call site.
async function processSIWEAccountCreation(
  viewer: Viewer,
  request: ProcessSIWEAccountCreationRequest,
): Promise<string> {
  const { calendarQuery, signedIdentityKeysBlob } = request;
  await verifyCalendarQueryThreadIDs(calendarQuery);

  const time = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [id] = await createIDs('users', 1);
  const newUserRow = [id, request.address, request.address, time];
  const newUserQuery = SQL`
    INSERT INTO users(id, username, ethereum_address, creation_time)
    VALUES ${[newUserRow]}
  `;
  const [userViewerData] = await Promise.all([
    createNewUserCookie(id, {
      platformDetails: request.platformDetails,
      deviceToken,
      socialProof: request.socialProof,
      signedIdentityKeysBlob,
    }),
    deleteCookie(viewer.cookieID),
    dbQuery(newUserQuery),
  ]);
  viewer.setNewCookie(userViewerData);

  await setNewSession(viewer, calendarQuery, 0);

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
    createPrivateThread(viewer, request.address),
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
  await Promise.all([createMessages(viewer, messageDatas)]);
  return id;
}

export { createAccount, processSIWEAccountCreation };
