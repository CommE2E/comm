// @flow

import type { Utility as OlmUtility } from '@commapp/olm';
import invariant from 'invariant';
import { getRustAPI } from 'rust-node-addon';
import { SiweErrorType, SiweMessage } from 'siwe';
import t, { type TInterface } from 'tcomb';
import bcrypt from 'twin-bcrypt';

import {
  baseLegalPolicies,
  policies,
  policyTypes,
  type PolicyType,
} from 'lib/facts/policies.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type {
  ServerKeyserverAuthRequest,
  ResetPasswordRequest,
  LogOutResponse,
  RegisterResponse,
  RegisterRequest,
  ServerLogInResponse,
  LogInRequest,
  UpdatePasswordRequest,
  UpdateUserSettingsRequest,
  PolicyAcknowledgmentRequest,
  ClaimUsernameRequest,
  ClaimUsernameResponse,
} from 'lib/types/account-types.js';
import {
  userSettingsTypes,
  notificationTypeValues,
  authActionSources,
  recoveryFromDataHandlerActionSources,
  recoveryFromReduxActionSources,
} from 'lib/types/account-types.js';
import {
  type ClientAvatar,
  type UpdateUserAvatarResponse,
  type UpdateUserAvatarRequest,
} from 'lib/types/avatar-types.js';
import type {
  ReservedUsernameMessage,
  IdentityKeysBlob,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import type {
  DeviceType,
  DeviceTokenUpdateRequest,
  PlatformDetails,
} from 'lib/types/device-types';
import {
  type CalendarQuery,
  type FetchEntryInfosBase,
  calendarQueryValidator,
} from 'lib/types/entry-types.js';
import { defaultNumberPerThread } from 'lib/types/message-types.js';
import type {
  SIWEAuthRequest,
  SIWEMessage,
  SIWESocialProof,
} from 'lib/types/siwe-types.js';
import {
  type SubscriptionUpdateRequest,
  type SubscriptionUpdateResponse,
} from 'lib/types/subscription-types.js';
import { type PasswordUpdate } from 'lib/types/user-types.js';
import {
  identityKeysBlobValidator,
  signedIdentityKeysBlobValidator,
} from 'lib/utils/crypto-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';
import {
  getPublicKeyFromSIWEStatement,
  isValidSIWEMessage,
  isValidSIWEStatementWithPublicKey,
  primaryIdentityPublicKeyRegex,
} from 'lib/utils/siwe-utils.js';
import {
  tShape,
  tPlatformDetails,
  tPassword,
  tEmail,
  tOldValidUsername,
  tRegex,
  tID,
  tUserID,
} from 'lib/utils/validation-utils.js';

import {
  entryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders.js';
import {
  createAndSendReservedUsernameMessage,
  sendMessagesOnAccountCreation,
  createAccount,
} from '../creators/account-creator.js';
import createIDs from '../creators/id-creator.js';
import {
  createOlmSession,
  persistFreshOlmSession,
} from '../creators/olm-session-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { deleteAccount } from '../deleters/account-deleters.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import { checkAndInvalidateSIWENonceEntry } from '../deleters/siwe-nonce-deleters.js';
import { fetchEntryInfos } from '../fetchers/entry-fetchers.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { fetchNotAcknowledgedPolicies } from '../fetchers/policy-acknowledgment-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  fetchKnownUserInfos,
  fetchLoggedInUserInfo,
  fetchUserIDForEthereumAddress,
  fetchUsername,
} from '../fetchers/user-fetchers.js';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
} from '../session/cookies.js';
import type { Viewer } from '../session/viewer.js';
import {
  passwordUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
  updateUserSettings,
  updateUserAvatar,
} from '../updaters/account-updaters.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';
import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters.js';
import { viewerAcknowledgmentUpdater } from '../updaters/viewer-acknowledgment-updater.js';
import { verifyUserLoggedIn } from '../user/login.js';
import { getOlmUtility, getContentSigningKey } from '../utils/olm-utils.js';

export const subscriptionUpdateRequestInputValidator: TInterface<SubscriptionUpdateRequest> =
  tShape<SubscriptionUpdateRequest>({
    threadID: tID,
    updatedFields: tShape({
      pushNotifs: t.maybe(t.Boolean),
      home: t.maybe(t.Boolean),
    }),
  });

async function userSubscriptionUpdateResponder(
  viewer: Viewer,
  request: SubscriptionUpdateRequest,
): Promise<SubscriptionUpdateResponse> {
  const threadSubscription = await userSubscriptionUpdater(viewer, request);
  return {
    threadSubscription,
  };
}

export const accountUpdateInputValidator: TInterface<PasswordUpdate> =
  tShape<PasswordUpdate>({
    updatedFields: tShape({
      email: t.maybe(tEmail),
      password: t.maybe(tPassword),
    }),
    currentPassword: tPassword,
  });

async function passwordUpdateResponder(
  viewer: Viewer,
  request: PasswordUpdate,
): Promise<void> {
  await passwordUpdater(viewer, request);
}

async function sendVerificationEmailResponder(viewer: Viewer): Promise<void> {
  await checkAndSendVerificationEmail(viewer);
}

export const resetPasswordRequestInputValidator: TInterface<ResetPasswordRequest> =
  tShape<ResetPasswordRequest>({
    usernameOrEmail: t.union([tEmail, tOldValidUsername]),
  });

async function sendPasswordResetEmailResponder(
  viewer: Viewer,
  request: ResetPasswordRequest,
): Promise<void> {
  await checkAndSendPasswordResetEmail(request);
}

async function logOutResponder(viewer: Viewer): Promise<LogOutResponse> {
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
      anonymous: true,
    },
  };
}

async function accountDeletionResponder(
  viewer: Viewer,
): Promise<LogOutResponse> {
  const result = await deleteAccount(viewer);
  invariant(result, 'deleteAccount should return result if handed request');
  return result;
}

type OldDeviceTokenUpdateRequest = {
  +deviceType?: ?DeviceType,
  +deviceToken: string,
};
const deviceTokenUpdateRequestInputValidator =
  tShape<OldDeviceTokenUpdateRequest>({
    deviceType: t.maybe(t.enums.of(['ios', 'android'])),
    deviceToken: t.String,
  });

export const registerRequestInputValidator: TInterface<RegisterRequest> =
  tShape<RegisterRequest>({
    username: t.String,
    email: t.maybe(tEmail),
    password: tPassword,
    calendarQuery: t.maybe(calendarQueryValidator),
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
    // We include `primaryIdentityPublicKey` to avoid breaking
    // old clients, but we no longer do anything with it.
    primaryIdentityPublicKey: t.maybe(tRegex(primaryIdentityPublicKeyRegex)),
    signedIdentityKeysBlob: t.maybe(signedIdentityKeysBlobValidator),
    initialNotificationsEncryptedMessage: t.maybe(t.String),
  });

async function accountCreationResponder(
  viewer: Viewer,
  request: RegisterRequest,
): Promise<RegisterResponse> {
  const { signedIdentityKeysBlob } = request;
  if (signedIdentityKeysBlob) {
    const identityKeys: IdentityKeysBlob = JSON.parse(
      signedIdentityKeysBlob.payload,
    );
    if (!identityKeysBlobValidator.is(identityKeys)) {
      throw new ServerError('invalid_identity_keys_blob');
    }

    const olmUtil: OlmUtility = getOlmUtility();
    try {
      olmUtil.ed25519_verify(
        identityKeys.primaryIdentityPublicKeys.ed25519,
        signedIdentityKeysBlob.payload,
        signedIdentityKeysBlob.signature,
      );
    } catch (e) {
      throw new ServerError('invalid_signature');
    }
  }
  return await createAccount(viewer, request);
}

type ProcessSuccessfulLoginParams = {
  +viewer: Viewer,
  +deviceTokenUpdateRequest?: ?DeviceTokenUpdateRequest,
  +platformDetails: PlatformDetails,
  +userID: string,
  +calendarQuery: ?CalendarQuery,
  +socialProof?: ?SIWESocialProof,
  +signedIdentityKeysBlob?: ?SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
  +pickledContentOlmSession?: string,
  +shouldMarkPoliciesAsAcceptedAfterCookieCreation?: boolean,
};

type ProcessSuccessfulLoginResult =
  | {
      +success: true,
      +newServerTime: number,
    }
  | {
      +success: false,
      +notAcknowledgedPolicies: $ReadOnlyArray<PolicyType>,
    };

async function processSuccessfulLogin(
  params: ProcessSuccessfulLoginParams,
): Promise<ProcessSuccessfulLoginResult> {
  const {
    viewer,
    deviceTokenUpdateRequest,
    platformDetails,
    userID,
    calendarQuery,
    socialProof,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
    pickledContentOlmSession,
    shouldMarkPoliciesAsAcceptedAfterCookieCreation,
  } = params;

  // Olm sessions have to be created before createNewUserCookie is called,
  // to avoid propagating a user cookie in case session creation fails
  const olmNotifSession = await (async () => {
    if (initialNotificationsEncryptedMessage && signedIdentityKeysBlob) {
      return await createOlmSession(
        initialNotificationsEncryptedMessage,
        'notifications',
      );
    }
    return null;
  })();

  const newServerTime = Date.now();
  const deviceToken = deviceTokenUpdateRequest
    ? deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;

  const setNewCookiePromise = (async () => {
    const [userViewerData] = await Promise.all([
      createNewUserCookie(userID, {
        platformDetails,
        deviceToken,
        socialProof,
        signedIdentityKeysBlob,
      }),
      deleteCookie(viewer.cookieID),
    ]);
    viewer.setNewCookie(userViewerData);
  })();
  const policiesCheckAndUpdate = (async () => {
    if (shouldMarkPoliciesAsAcceptedAfterCookieCreation) {
      await setNewCookiePromise;
      await viewerAcknowledgmentUpdater(
        viewer,
        policyTypes.tosAndPrivacyPolicy,
      );
    }
    return await fetchNotAcknowledgedPolicies(userID, baseLegalPolicies);
  })();
  const [notAcknowledgedPolicies] = await Promise.all([
    policiesCheckAndUpdate,
    setNewCookiePromise,
  ]);

  if (
    notAcknowledgedPolicies.length &&
    hasMinCodeVersion(viewer.platformDetails, { native: 181 })
  ) {
    return { success: false, notAcknowledgedPolicies };
  }

  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, newServerTime);
  }

  const persistOlmNotifSessionPromise = (async () => {
    if (olmNotifSession && viewer.cookieID) {
      await persistFreshOlmSession(
        olmNotifSession,
        'notifications',
        viewer.cookieID,
      );
    }
  })();

  // `pickledContentOlmSession` is created in `keyserverAuthResponder(...)` in
  // order to authenticate the user. Here, we simply persist the session if it
  // exists.
  const persistOlmContentSessionPromise = (async () => {
    if (viewer.cookieID && pickledContentOlmSession) {
      await persistFreshOlmSession(
        pickledContentOlmSession,
        'content',
        viewer.cookieID,
      );
    }
  })();

  await Promise.all([
    persistOlmNotifSessionPromise,
    persistOlmContentSessionPromise,
  ]);

  return { success: true, newServerTime };
}

type FetchLoginResponseParams = {
  +viewer: Viewer,
  +watchedIDs: $ReadOnlyArray<string>,
  +calendarQuery: ?CalendarQuery,
  +newServerTime: number,
};

async function fetchLoginResponse(
  params: FetchLoginResponseParams,
): Promise<ServerLogInResponse> {
  const { viewer, watchedIDs, calendarQuery } = params;

  const threadCursors: { [string]: null } = {};
  for (const watchedThreadID of watchedIDs) {
    threadCursors[watchedThreadID] = null;
  }
  const messageSelectionCriteria = { threadCursors, joinedThreads: true };

  const entriesPromise: Promise<?FetchEntryInfosBase> = (async () => {
    if (!calendarQuery) {
      return undefined;
    }
    return await fetchEntryInfos(viewer, [calendarQuery]);
  })();

  const [
    threadsResult,
    messagesResult,
    entriesResult,
    userInfos,
    currentUserInfo,
  ] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchMessageInfos(viewer, messageSelectionCriteria, defaultNumberPerThread),
    entriesPromise,
    fetchKnownUserInfos(viewer),
    fetchLoggedInUserInfo(viewer),
  ]);

  const rawEntryInfos = entriesResult ? entriesResult.rawEntryInfos : null;
  const response: ServerLogInResponse = {
    currentUserInfo,
    rawMessageInfos: messagesResult.rawMessageInfos,
    truncationStatuses: messagesResult.truncationStatuses,
    serverTime: params.newServerTime,
    userInfos: values(userInfos),
    cookieChange: {
      threadInfos: threadsResult.threadInfos,
      userInfos: [],
    },
  };
  if (rawEntryInfos) {
    return {
      ...response,
      rawEntryInfos,
    };
  }
  return response;
}

type HandleSuccessfulLoginResultParams = {
  +viewer: Viewer,
  +watchedIDs: $ReadOnlyArray<string>,
  +calendarQuery: ?CalendarQuery,
};

async function handleSuccessfulLoginResult(
  result: ProcessSuccessfulLoginResult,
  params: HandleSuccessfulLoginResultParams,
): Promise<ServerLogInResponse> {
  const { viewer, watchedIDs, calendarQuery } = params;

  if (!result.success) {
    const currentUserInfo = await fetchLoggedInUserInfo(viewer);
    return {
      notAcknowledgedPolicies: result.notAcknowledgedPolicies,
      currentUserInfo: currentUserInfo,
      rawMessageInfos: [],
      truncationStatuses: {},
      userInfos: [],
      rawEntryInfos: [],
      serverTime: 0,
      cookieChange: {
        threadInfos: {},
        userInfos: [],
      },
    };
  }

  return await fetchLoginResponse({
    viewer,
    watchedIDs,
    calendarQuery,
    newServerTime: result.newServerTime,
  });
}

export const logInRequestInputValidator: TInterface<LogInRequest> =
  tShape<LogInRequest>({
    username: t.maybe(t.String),
    usernameOrEmail: t.maybe(t.union([tEmail, tOldValidUsername])),
    password: tPassword,
    watchedIDs: t.list(tID),
    calendarQuery: t.maybe(entryQueryInputValidator),
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
    source: t.maybe(t.enums.of(values(authActionSources))),
    // We include `primaryIdentityPublicKey` to avoid breaking
    // old clients, but we no longer do anything with it.
    primaryIdentityPublicKey: t.maybe(tRegex(primaryIdentityPublicKeyRegex)),
    signedIdentityKeysBlob: t.maybe(signedIdentityKeysBlobValidator),
    initialNotificationsEncryptedMessage: t.maybe(t.String),
  });

async function logInResponder(
  viewer: Viewer,
  request: LogInRequest,
): Promise<ServerLogInResponse> {
  let identityKeys: ?IdentityKeysBlob;
  const { signedIdentityKeysBlob, initialNotificationsEncryptedMessage } =
    request;
  if (signedIdentityKeysBlob) {
    identityKeys = JSON.parse(signedIdentityKeysBlob.payload);

    const olmUtil: OlmUtility = getOlmUtility();
    try {
      olmUtil.ed25519_verify(
        identityKeys.primaryIdentityPublicKeys.ed25519,
        signedIdentityKeysBlob.payload,
        signedIdentityKeysBlob.signature,
      );
    } catch (e) {
      throw new ServerError('invalid_signature');
    }
  }

  const calendarQuery = request.calendarQuery
    ? normalizeCalendarQuery(request.calendarQuery)
    : null;
  const verifyCalendarQueryThreadIDsPromise = (async () => {
    if (calendarQuery) {
      await verifyCalendarQueryThreadIDs(calendarQuery);
    }
  })();

  const username = request.username ?? request.usernameOrEmail;
  if (!username) {
    if (hasMinCodeVersion(viewer.platformDetails, { native: 150 })) {
      throw new ServerError('invalid_credentials');
    } else {
      throw new ServerError('invalid_parameters');
    }
  }
  const userQuery = SQL`
    SELECT id, hash, username
    FROM users
    WHERE LCASE(username) = LCASE(${username})
  `;
  const userQueryPromise = dbQuery(userQuery);
  const [[userResult]] = await Promise.all([
    userQueryPromise,
    verifyCalendarQueryThreadIDsPromise,
  ]);

  if (userResult.length === 0) {
    if (hasMinCodeVersion(viewer.platformDetails, { native: 150 })) {
      throw new ServerError('invalid_credentials');
    } else {
      throw new ServerError('invalid_parameters');
    }
  }

  const userRow = userResult[0];

  if (!userRow.hash || !bcrypt.compareSync(request.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const id = userRow.id.toString();

  const processSuccessfulLoginResult = await processSuccessfulLogin({
    viewer,
    platformDetails: request.platformDetails,
    deviceTokenUpdateRequest: request.deviceTokenUpdateRequest,
    userID: id,
    calendarQuery,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
  });
  return await handleSuccessfulLoginResult(processSuccessfulLoginResult, {
    viewer,
    watchedIDs: request.watchedIDs,
    calendarQuery,
  });
}

export const siweAuthRequestInputValidator: TInterface<SIWEAuthRequest> =
  tShape<SIWEAuthRequest>({
    signature: t.String,
    message: t.String,
    calendarQuery: entryQueryInputValidator,
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
    watchedIDs: t.list(tID),
    signedIdentityKeysBlob: t.maybe(signedIdentityKeysBlobValidator),
    initialNotificationsEncryptedMessage: t.maybe(t.String),
    doNotRegister: t.maybe(t.Boolean),
  });

async function siweAuthResponder(
  viewer: Viewer,
  request: SIWEAuthRequest,
): Promise<ServerLogInResponse> {
  const {
    message,
    signature,
    deviceTokenUpdateRequest,
    platformDetails,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
    doNotRegister,
    watchedIDs,
  } = request;
  const calendarQuery = normalizeCalendarQuery(request.calendarQuery);

  // 1. Ensure that `message` is a well formed Comm SIWE Auth message.
  const siweMessage: SIWEMessage = new SiweMessage(message);
  if (!isValidSIWEMessage(siweMessage)) {
    throw new ServerError('invalid_parameters');
  }

  // 2. Check if there's already a user for this ETH address.
  //    Verify calendarQuery.
  const [existingUserID] = await Promise.all([
    fetchUserIDForEthereumAddress(siweMessage.address),
    verifyCalendarQueryThreadIDs(calendarQuery),
  ]);
  if (!existingUserID && doNotRegister) {
    throw new ServerError('account_does_not_exist');
  }

  // 3. Ensure that the `nonce` exists in the `siwe_nonces` table
  //    AND hasn't expired. If those conditions are met, delete the entry to
  //    ensure that the same `nonce` can't be re-used in a future request.
  const wasNonceCheckedAndInvalidated = await checkAndInvalidateSIWENonceEntry(
    siweMessage.nonce,
  );
  if (!wasNonceCheckedAndInvalidated) {
    throw new ServerError('invalid_parameters');
  }

  // 4. Validate SIWEMessage signature and handle possible errors.
  try {
    await siweMessage.verify({ signature });
  } catch (error) {
    if (error === SiweErrorType.EXPIRED_MESSAGE) {
      // Thrown when the `expirationTime` is present and in the past.
      throw new ServerError('expired_message');
    } else if (error === SiweErrorType.INVALID_SIGNATURE) {
      // Thrown when the `validate()` function can't verify the message.
      throw new ServerError('invalid_signature');
    } else {
      throw new ServerError('unknown_error');
    }
  }

  // 5. Pull `primaryIdentityPublicKey` out from SIWEMessage `statement`.
  //    We expect it to be included for BOTH native and web clients.
  const { statement } = siweMessage;
  const primaryIdentityPublicKey =
    statement && isValidSIWEStatementWithPublicKey(statement)
      ? getPublicKeyFromSIWEStatement(statement)
      : null;
  if (!primaryIdentityPublicKey) {
    throw new ServerError('invalid_siwe_statement_public_key');
  }

  // 6. Verify `signedIdentityKeysBlob.payload` with included `signature`
  //    if `signedIdentityKeysBlob` was included in the `SIWEAuthRequest`.
  let identityKeys: ?IdentityKeysBlob;
  if (signedIdentityKeysBlob) {
    identityKeys = JSON.parse(signedIdentityKeysBlob.payload);
    if (!identityKeysBlobValidator.is(identityKeys)) {
      throw new ServerError('invalid_identity_keys_blob');
    }

    const olmUtil: OlmUtility = getOlmUtility();
    try {
      olmUtil.ed25519_verify(
        identityKeys.primaryIdentityPublicKeys.ed25519,
        signedIdentityKeysBlob.payload,
        signedIdentityKeysBlob.signature,
      );
    } catch (e) {
      throw new ServerError('invalid_signature');
    }
  }

  // 7. Ensure that `primaryIdentityPublicKeys.ed25519` matches SIWE
  //    statement `primaryIdentityPublicKey` if `identityKeys` exists.
  if (
    identityKeys &&
    identityKeys.primaryIdentityPublicKeys.ed25519 !== primaryIdentityPublicKey
  ) {
    throw new ServerError('primary_public_key_mismatch');
  }

  // 8. Construct `SIWESocialProof` object with the stringified
  //    SIWEMessage and the corresponding signature.
  const socialProof: SIWESocialProof = {
    siweMessage: siweMessage.toMessage(),
    siweMessageSignature: signature,
  };

  // 9. Create account if address does not correspond to an existing user.
  const userID = await (async () => {
    if (existingUserID) {
      return existingUserID;
    }
    const time = Date.now();
    const [id] = await createIDs('users', 1);
    const newUserRow = [id, siweMessage.address, siweMessage.address, time];
    const newUserQuery = SQL`
      INSERT INTO users(id, username, ethereum_address, creation_time)
      VALUES ${[newUserRow]}
    `;

    await dbQuery(newUserQuery);
    return id;
  })();

  // 10. Complete login with call to `processSuccessfulLogin(...)`.
  const processSuccessfulLoginResult = await processSuccessfulLogin({
    viewer,
    platformDetails,
    deviceTokenUpdateRequest,
    userID,
    calendarQuery,
    socialProof,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
    shouldMarkPoliciesAsAcceptedAfterCookieCreation: !existingUserID,
  });

  // 11. Create messages with call to `sendMessagesOnAccountCreation(...)`,
  //     if the account has just been registered. Also, set the username as
  //     reserved.
  if (!existingUserID) {
    await sendMessagesOnAccountCreation(viewer);

    ignorePromiseRejections(
      createAndSendReservedUsernameMessage([
        { username: siweMessage.address, userID },
      ]),
    );
  }

  // 12. Fetch data from MariaDB for the response.
  return await handleSuccessfulLoginResult(processSuccessfulLoginResult, {
    viewer,
    watchedIDs,
    calendarQuery,
  });
}

export const keyserverAuthRequestInputValidator: TInterface<ServerKeyserverAuthRequest> =
  tShape<ServerKeyserverAuthRequest>({
    userID: tUserID,
    deviceID: t.String,
    calendarQuery: entryQueryInputValidator,
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
    watchedIDs: t.list(tID),
    initialContentEncryptedMessage: t.String,
    initialNotificationsEncryptedMessage: t.String,
    doNotRegister: t.Boolean,
    source: t.maybe(t.enums.of(values(authActionSources))),
    password: t.maybe(tPassword),
  });

async function keyserverAuthResponder(
  viewer: Viewer,
  request: ServerKeyserverAuthRequest,
): Promise<ServerLogInResponse> {
  const {
    userID,
    deviceID,
    initialContentEncryptedMessage,
    initialNotificationsEncryptedMessage,
    doNotRegister,
    source,
  } = request;
  if (
    Object.values(recoveryFromReduxActionSources).includes(source) ||
    Object.values(recoveryFromDataHandlerActionSources).includes(source)
  ) {
    console.log(
      `Session recovery attempted by userID=${userID} source=${source ?? ''}`,
    );
  }
  const calendarQuery = normalizeCalendarQuery(request.calendarQuery);

  // 1. Check if there's already a user for this userID. Simultaneously, get
  //    info for identity service auth.
  const [existingUsername, authDeviceID, identityInfo, rustAPI] =
    await Promise.all([
      fetchUsername(userID),
      getContentSigningKey(),
      verifyUserLoggedIn(),
      getRustAPI(),
      verifyCalendarQueryThreadIDs(calendarQuery),
    ]);
  if (!existingUsername && doNotRegister) {
    throw new ServerError('account_does_not_exist');
  }
  if (!identityInfo) {
    throw new ServerError('account_not_registered_on_identity_service');
  }

  // 2. Get user's keys from identity service.
  let inboundKeysForUser;
  try {
    inboundKeysForUser = await rustAPI.getInboundKeysForUserDevice(
      identityInfo.userId,
      authDeviceID,
      identityInfo.accessToken,
      userID,
      deviceID,
    );
  } catch (e) {
    console.log(e);
    throw new ServerError('failed_to_retrieve_inbound_keys');
  }

  const username = inboundKeysForUser.username
    ? inboundKeysForUser.username
    : inboundKeysForUser.walletAddress;

  if (!username) {
    throw new ServerError('user_identifier_missing');
  }

  const identityKeys: IdentityKeysBlob = JSON.parse(inboundKeysForUser.payload);
  if (!identityKeysBlobValidator.is(identityKeys)) {
    throw new ServerError('invalid_identity_keys_blob');
  }

  // 3. Create content olm session. (The notif session was introduced first and
  //    as such is created in legacy auth responders as well. It's factored out
  //    into in the shared utility `processSuccessfulLogin(...)`.)
  const pickledContentOlmSessionPromise = createOlmSession(
    initialContentEncryptedMessage,
    'content',
    identityKeys.primaryIdentityPublicKeys.curve25519,
  );

  // 4. Create account if username does not correspond to an existing user.
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: inboundKeysForUser.payload,
    signature: inboundKeysForUser.payloadSignature,
  };
  const olmAccountCreationPromise = (async () => {
    if (existingUsername) {
      return;
    }

    const time = Date.now();
    const newUserRow = [
      userID,
      username,
      inboundKeysForUser.walletAddress,
      time,
    ];
    const newUserQuery = SQL`
      INSERT INTO users(id, username, ethereum_address, creation_time)
      VALUES ${[newUserRow]}
  `;
    await dbQuery(newUserQuery);
  })();

  const [pickledContentOlmSession] = await Promise.all([
    pickledContentOlmSessionPromise,
    olmAccountCreationPromise,
  ]);

  // 5. Complete login with call to `processSuccessfulLogin(...)`.
  const processSuccessfulLoginResult = await processSuccessfulLogin({
    viewer,
    platformDetails: request.platformDetails,
    deviceTokenUpdateRequest: request.deviceTokenUpdateRequest,
    userID,
    calendarQuery,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
    pickledContentOlmSession,
    shouldMarkPoliciesAsAcceptedAfterCookieCreation: !existingUsername,
  });

  // 6. Create messages with call to `sendMessagesOnAccountCreation(...)`,
  //    if the account has just been registered.
  if (!existingUsername) {
    await sendMessagesOnAccountCreation(viewer);
  }

  // 7. Fetch data from MariaDB for the response.
  return await handleSuccessfulLoginResult(processSuccessfulLoginResult, {
    viewer,
    watchedIDs: request.watchedIDs,
    calendarQuery,
  });
}

export const updatePasswordRequestInputValidator: TInterface<UpdatePasswordRequest> =
  tShape<UpdatePasswordRequest>({
    code: t.String,
    password: tPassword,
    watchedIDs: t.list(tID),
    calendarQuery: t.maybe(entryQueryInputValidator),
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
  });

async function oldPasswordUpdateResponder(
  viewer: Viewer,
  request: UpdatePasswordRequest,
): Promise<ServerLogInResponse> {
  if (request.calendarQuery) {
    request.calendarQuery = normalizeCalendarQuery(request.calendarQuery);
  }
  return await updatePassword(viewer, request);
}

export const updateUserSettingsInputValidator: TInterface<UpdateUserSettingsRequest> =
  tShape<UpdateUserSettingsRequest>({
    name: t.irreducible(
      userSettingsTypes.DEFAULT_NOTIFICATIONS,
      x => x === userSettingsTypes.DEFAULT_NOTIFICATIONS,
    ),
    data: t.enums.of(notificationTypeValues),
  });

async function updateUserSettingsResponder(
  viewer: Viewer,
  request: UpdateUserSettingsRequest,
): Promise<void> {
  await updateUserSettings(viewer, request);
}

export const policyAcknowledgmentRequestInputValidator: TInterface<PolicyAcknowledgmentRequest> =
  tShape<PolicyAcknowledgmentRequest>({
    policy: t.maybe(t.enums.of(policies)),
  });

async function policyAcknowledgmentResponder(
  viewer: Viewer,
  request: PolicyAcknowledgmentRequest,
): Promise<void> {
  await viewerAcknowledgmentUpdater(viewer, request.policy);
}

async function updateUserAvatarResponder(
  viewer: Viewer,
  request: UpdateUserAvatarRequest,
): Promise<?ClientAvatar | UpdateUserAvatarResponse> {
  return await updateUserAvatar(viewer, request);
}

export const claimUsernameRequestInputValidator: TInterface<ClaimUsernameRequest> =
  tShape<ClaimUsernameRequest>({
    username: t.String,
    password: tPassword,
  });

async function claimUsernameResponder(
  viewer: Viewer,
  request: ClaimUsernameRequest,
): Promise<ClaimUsernameResponse> {
  const username = request.username;

  const userQuery = SQL`
    SELECT id, hash, username
    FROM users
    WHERE LCASE(username) = LCASE(${request.username})
  `;
  const [[userResult], accountInfo] = await Promise.all([
    dbQuery(userQuery),
    fetchOlmAccount('content'),
  ]);

  if (userResult.length === 0) {
    throw new ServerError('invalid_credentials');
  }

  const userRow = userResult[0];

  if (!userRow.hash) {
    throw new ServerError('invalid_parameters');
  }

  if (!bcrypt.compareSync(request.password, userRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const userID = userRow.id;

  const issuedAt = new Date().toISOString();
  const reservedUsernameMessage: ReservedUsernameMessage = {
    statement: 'This user is the owner of the following username and user ID',
    payload: {
      username,
      userID,
    },
    issuedAt,
  };
  const message = JSON.stringify(reservedUsernameMessage);
  const signature = accountInfo.account.sign(message);

  return { message, signature };
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
  siweAuthResponder,
  oldPasswordUpdateResponder,
  updateUserSettingsResponder,
  policyAcknowledgmentResponder,
  updateUserAvatarResponder,
  claimUsernameResponder,
  keyserverAuthResponder,
};
