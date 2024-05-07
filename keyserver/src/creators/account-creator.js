// @flow

import { getRustAPI } from 'rust-node-addon';
import bcrypt from 'twin-bcrypt';

import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import { policyTypes } from 'lib/facts/policies.js';
import { validUsernameRegex } from 'lib/shared/account-utils.js';
import type {
  RegisterResponse,
  RegisterRequest,
} from 'lib/types/account-types.js';
import type {
  UserDetail,
  ReservedUsernameMessage,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type {
  PlatformDetails,
  DeviceTokenUpdateRequest,
} from 'lib/types/device-types.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { SIWESocialProof } from 'lib/types/siwe-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';
import { reservedUsernamesSet } from 'lib/utils/reserved-users.js';
import { isValidEthereumAddress } from 'lib/utils/siwe-utils.js';

import createIDs from './id-creator.js';
import createMessages from './message-creator.js';
import {
  persistFreshOlmSession,
  createOlmSession,
} from './olm-session-creator.js';
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
import { searchForUser } from '../search/users.js';
import { createNewUserCookie, setNewSession } from '../session/cookies.js';
import { createScriptViewer } from '../session/scripts.js';
import type { Viewer } from '../session/viewer.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { viewerAcknowledgmentUpdater } from '../updaters/viewer-acknowledgment-updater.js';
import { thisKeyserverAdmin } from '../user/identity.js';

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
  if (
    request.username.search(validUsernameRegex) === -1 ||
    isValidEthereumAddress(request.username.toLowerCase())
  ) {
    throw new ServerError('invalid_username');
  }

  const promises = [searchForUser(request.username), thisKeyserverAdmin()];
  const {
    calendarQuery,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
  } = request;
  if (calendarQuery) {
    promises.push(verifyCalendarQueryThreadIDs(calendarQuery));
  }

  const [existingUser, admin] = await Promise.all(promises);
  if (reservedUsernamesSet.has(request.username.toLowerCase())) {
    throw new ServerError('username_reserved');
  }
  if (existingUser) {
    throw new ServerError('username_taken');
  }

  // Olm sessions have to be created before createNewUserCookie is called,
  // to avoid propagating a user cookie in case session creation fails
  const olmNotifSession = await (async () => {
    if (initialNotificationsEncryptedMessage) {
      return await createOlmSession(
        initialNotificationsEncryptedMessage,
        'notifications',
      );
    }
    return null;
  })();

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

  const persistOlmNotifSessionPromise = (async () => {
    if (olmNotifSession && userViewerData.cookieID) {
      await persistFreshOlmSession(
        olmNotifSession,
        'notifications',
        userViewerData.cookieID,
      );
    }
  })();

  await Promise.all([
    updateThread(
      createScriptViewer(admin.id),
      {
        threadID: genesis().id,
        changes: { newMemberIDs: [id] },
      },
      { forceAddMembers: true, silenceMessages: true, ignorePermissions: true },
    ),
    viewerAcknowledgmentUpdater(viewer, policyTypes.tosAndPrivacyPolicy),
    persistOlmNotifSessionPromise,
  ]);

  const [privateThreadResult, ashoatThreadResult] = await Promise.all([
    createPrivateThread(viewer),
    createThread(
      viewer,
      {
        type: threadTypes.PERSONAL,
        initialMemberIDs: [admin.id],
      },
      { forceAddMembers: true },
    ),
  ]);
  const ashoatThreadID = ashoatThreadResult.newThreadID;
  const privateThreadID = privateThreadResult.newThreadID;

  let messageTime = Date.now();
  const ashoatMessageDatas = ashoatMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: ashoatThreadID,
    creatorID: admin.id,
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

  ignorePromiseRejections(
    createAndSendReservedUsernameMessage([
      { username: request.username, userID: id },
    ]),
  );

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
    viewerAcknowledgmentUpdater(viewer, policyTypes.tosAndPrivacyPolicy),
    processAccountCreationCommon(viewer),
  ]);

  ignorePromiseRejections(
    createAndSendReservedUsernameMessage([
      { username: request.address, userID: id },
    ]),
  );

  return id;
}

async function processAccountCreationCommon(viewer: Viewer) {
  const admin = await thisKeyserverAdmin();

  await updateThread(
    createScriptViewer(admin.id),
    {
      threadID: genesis().id,
      changes: { newMemberIDs: [viewer.userID] },
    },
    { forceAddMembers: true, silenceMessages: true, ignorePermissions: true },
  );

  const [privateThreadResult, ashoatThreadResult] = await Promise.all([
    createPrivateThread(viewer),
    createThread(
      viewer,
      {
        type: threadTypes.PERSONAL,
        initialMemberIDs: [admin.id],
      },
      { forceAddMembers: true },
    ),
  ]);
  const ashoatThreadID = ashoatThreadResult.newThreadID;
  const privateThreadID = privateThreadResult.newThreadID;

  let messageTime = Date.now();
  const ashoatMessageDatas = ashoatMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: ashoatThreadID,
    creatorID: admin.id,
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
}

async function createAndSendReservedUsernameMessage(
  payload: $ReadOnlyArray<UserDetail>,
) {
  const issuedAt = new Date().toISOString();
  const reservedUsernameMessage: ReservedUsernameMessage = {
    statement: 'Add the following usernames to reserved list',
    payload,
    issuedAt,
  };
  const stringifiedMessage = JSON.stringify(reservedUsernameMessage);

  const [rustAPI, accountInfo] = await Promise.all([
    getRustAPI(),
    fetchOlmAccount('content'),
  ]);
  const signature = accountInfo.account.sign(stringifiedMessage);

  await rustAPI.addReservedUsernames(stringifiedMessage, signature);
}

export {
  createAccount,
  processSIWEAccountCreation,
  processAccountCreationCommon,
};
