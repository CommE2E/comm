// @flow

import { getRustAPI } from 'rust-node-addon';
import bcrypt from 'twin-bcrypt';

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
} from 'lib/types/crypto-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
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
import { createThread } from './thread-creator.js';
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
import {
  isAuthoritativeKeyserver,
  thisKeyserverAdmin,
} from '../user/identity.js';

const adminMessages = [
  'welcome to Comm!',
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
  if (
    request.username.search(validUsernameRegex) === -1 ||
    isValidEthereumAddress(request.username.toLowerCase())
  ) {
    throw new ServerError('invalid_username');
  }

  const promises = [searchForUser(request.username)];
  const {
    calendarQuery,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
  } = request;
  if (calendarQuery) {
    promises.push(verifyCalendarQueryThreadIDs(calendarQuery));
  }

  const [existingUser] = await Promise.all(promises);
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
    viewerAcknowledgmentUpdater(viewer, policyTypes.tosAndPrivacyPolicy),
    persistOlmNotifSessionPromise,
  ]);

  const rawMessageInfos = await sendMessagesOnAccountCreation(viewer);

  const [threadsResult, userInfos, currentUserInfo] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchKnownUserInfos(viewer),
    fetchLoggedInUserInfo(viewer),
  ]);

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

async function sendMessagesOnAccountCreation(
  viewer: Viewer,
): Promise<RawMessageInfo[]> {
  const isAuthoritative = await isAuthoritativeKeyserver();
  if (!isAuthoritative) {
    return [];
  }

  const admin = await thisKeyserverAdmin();
  const adminViewer = createScriptViewer(admin.id);

  await updateThread(
    adminViewer,
    {
      threadID: genesis().id,
      changes: { newMemberIDs: [viewer.userID] },
    },
    { forceAddMembers: true, silenceMessages: true, ignorePermissions: true },
  );

  const adminThreadResult = await createThread(
    adminViewer,
    {
      type: threadTypes.GENESIS_PERSONAL,
      initialMemberIDs: [viewer.id],
    },
    { forceAddMembers: true },
  );
  const adminThreadID = adminThreadResult.newThreadID;

  let messageTime = Date.now();
  const adminMessageDatas = adminMessages.map(message => ({
    type: messageTypes.TEXT,
    threadID: adminThreadID,
    creatorID: admin.id,
    time: messageTime++,
    text: message,
  }));
  const adminMessageInfos = await createMessages(
    adminViewer,
    adminMessageDatas,
  );

  return [...adminThreadResult.newMessageInfos, ...adminMessageInfos];
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
  sendMessagesOnAccountCreation,
  createAndSendReservedUsernameMessage,
};
