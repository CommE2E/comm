// @flow

import type { Utility as OlmUtility } from '@commapp/olm';
import invariant from 'invariant';
import { ErrorTypes, SiweMessage } from 'siwe';
import t, { type TInterface, type TUnion } from 'tcomb';
import bcrypt from 'twin-bcrypt';

import {
  baseLegalPolicies,
  policies,
  policyTypeValidator,
} from 'lib/facts/policies.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
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
  PolicyAcknowledgmentRequest,
} from 'lib/types/account-types.js';
import {
  userSettingsTypes,
  notificationTypeValues,
  logInActionSources,
} from 'lib/types/account-types.js';
import {
  type ClientAvatar,
  clientAvatarValidator,
  type UpdateUserAvatarResponse,
  type UpdateUserAvatarRequest,
} from 'lib/types/avatar-types.js';
import type {
  IdentityKeysBlob,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
import {
  type CalendarQuery,
  rawEntryInfoValidator,
} from 'lib/types/entry-types.js';
import {
  defaultNumberPerThread,
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from 'lib/types/message-types.js';
import type {
  SIWEAuthRequest,
  SIWEMessage,
  SIWESocialProof,
} from 'lib/types/siwe-types.js';
import {
  type SubscriptionUpdateRequest,
  type SubscriptionUpdateResponse,
  threadSubscriptionValidator,
} from 'lib/types/subscription-types.js';
import { rawThreadInfoValidator } from 'lib/types/thread-types.js';
import { createUpdatesResultValidator } from 'lib/types/update-types.js';
import {
  type PasswordUpdate,
  loggedOutUserInfoValidator,
  loggedInUserInfoValidator,
  oldLoggedInUserInfoValidator,
  userInfoValidator,
} from 'lib/types/user-types.js';
import {
  identityKeysBlobValidator,
  signedIdentityKeysBlobValidator,
} from 'lib/utils/crypto-utils.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import { promiseAll } from 'lib/utils/promises.js';
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
} from 'lib/utils/validation-utils.js';

import {
  entryQueryInputValidator,
  newEntryQueryInputValidator,
  normalizeCalendarQuery,
  verifyCalendarQueryThreadIDs,
} from './entry-responders.js';
import {
  createAccount,
  processSIWEAccountCreation,
} from '../creators/account-creator.js';
import { createOlmSession } from '../creators/olm-session-creator.js';
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
} from '../fetchers/user-fetchers.js';
import {
  createNewAnonymousCookie,
  createNewUserCookie,
  setNewSession,
} from '../session/cookies.js';
import { verifyClientSupported } from '../session/version.js';
import type { Viewer } from '../session/viewer.js';
import {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updatePassword,
  updateUserSettings,
  updateUserAvatar,
} from '../updaters/account-updaters.js';
import { userSubscriptionUpdater } from '../updaters/user-subscription-updaters.js';
import { viewerAcknowledgmentUpdater } from '../updaters/viewer-acknowledgment-updater.js';
import { getOlmUtility } from '../utils/olm-utils.js';

export const subscriptionUpdateRequestInputValidator: TInterface<SubscriptionUpdateRequest> =
  tShape<SubscriptionUpdateRequest>({
    threadID: tID,
    updatedFields: tShape({
      pushNotifs: t.maybe(t.Boolean),
      home: t.maybe(t.Boolean),
    }),
  });

export const subscriptionUpdateResponseValidator: TInterface<SubscriptionUpdateResponse> =
  tShape<SubscriptionUpdateResponse>({
    threadSubscription: threadSubscriptionValidator,
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
  await accountUpdater(viewer, request);
}

async function sendVerificationEmailResponder(viewer: Viewer): Promise<void> {
  if (!viewer.isSocket) {
    await verifyClientSupported(viewer, viewer.platformDetails);
  }
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

export const logOutResponseValidator: TInterface<LogOutResponse> =
  tShape<LogOutResponse>({
    currentUserInfo: loggedOutUserInfoValidator,
  });

async function logOutResponder(viewer: Viewer): Promise<LogOutResponse> {
  if (!viewer.isSocket) {
    await verifyClientSupported(viewer, viewer.platformDetails);
  }
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

export const deleteAccountRequestInputValidator: TInterface<DeleteAccountRequest> =
  tShape<DeleteAccountRequest>({
    password: t.maybe(tPassword),
  });

async function accountDeletionResponder(
  viewer: Viewer,
  request: DeleteAccountRequest,
): Promise<LogOutResponse> {
  const result = await deleteAccount(viewer, request);
  invariant(result, 'deleteAccount should return result if handed request');
  return result;
}

const deviceTokenUpdateRequestInputValidator = tShape({
  deviceType: t.maybe(t.enums.of(['ios', 'android'])),
  deviceToken: t.String,
});

export const registerRequestInputValidator: TInterface<RegisterRequest> =
  tShape<RegisterRequest>({
    username: t.String,
    email: t.maybe(tEmail),
    password: tPassword,
    calendarQuery: t.maybe(newEntryQueryInputValidator),
    deviceTokenUpdateRequest: t.maybe(deviceTokenUpdateRequestInputValidator),
    platformDetails: tPlatformDetails,
    // We include `primaryIdentityPublicKey` to avoid breaking
    // old clients, but we no longer do anything with it.
    primaryIdentityPublicKey: t.maybe(tRegex(primaryIdentityPublicKeyRegex)),
    signedIdentityKeysBlob: t.maybe(signedIdentityKeysBlobValidator),
    initialNotificationsEncryptedMessage: t.maybe(t.String),
  });

export const registerResponseValidator: TInterface<RegisterResponse> =
  tShape<RegisterResponse>({
    id: t.String,
    rawMessageInfos: t.list(rawMessageInfoValidator),
    currentUserInfo: t.union([
      oldLoggedInUserInfoValidator,
      loggedInUserInfoValidator,
    ]),
    cookieChange: tShape({
      threadInfos: t.dict(tID, rawThreadInfoValidator),
      userInfos: t.list(userInfoValidator),
    }),
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
  +input: any,
  +userID: string,
  +calendarQuery: ?CalendarQuery,
  +socialProof?: ?SIWESocialProof,
  +signedIdentityKeysBlob?: ?SignedIdentityKeysBlob,
  +initialNotificationsEncryptedMessage?: string,
};

async function processSuccessfulLogin(
  params: ProcessSuccessfulLoginParams,
): Promise<LogInResponse> {
  const {
    viewer,
    input,
    userID,
    calendarQuery,
    socialProof,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
  } = params;

  const request: LogInRequest = input;
  const newServerTime = Date.now();
  const deviceToken = request.deviceTokenUpdateRequest
    ? request.deviceTokenUpdateRequest.deviceToken
    : viewer.deviceToken;
  const [userViewerData, notAcknowledgedPolicies] = await Promise.all([
    createNewUserCookie(userID, {
      platformDetails: request.platformDetails,
      deviceToken,
      socialProof,
      signedIdentityKeysBlob,
    }),
    fetchNotAcknowledgedPolicies(userID, baseLegalPolicies),
    deleteCookie(viewer.cookieID),
  ]);
  viewer.setNewCookie(userViewerData);

  if (
    notAcknowledgedPolicies.length &&
    hasMinCodeVersion(viewer.platformDetails, { native: 181 })
  ) {
    const currentUserInfo = await fetchLoggedInUserInfo(viewer);
    return {
      notAcknowledgedPolicies,
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

  if (calendarQuery) {
    await setNewSession(viewer, calendarQuery, newServerTime);
  }
  const olmSessionPromise = (async () => {
    if (
      userViewerData.cookieID &&
      initialNotificationsEncryptedMessage &&
      signedIdentityKeysBlob
    ) {
      await createOlmSession(
        initialNotificationsEncryptedMessage,
        'notifications',
        userViewerData.cookieID,
      );
    }
  })();

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
    olmSessionPromise,
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
    return {
      ...response,
      rawEntryInfos,
    };
  }
  return response;
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
    source: t.maybe(t.enums.of(values(logInActionSources))),
    // We include `primaryIdentityPublicKey` to avoid breaking
    // old clients, but we no longer do anything with it.
    primaryIdentityPublicKey: t.maybe(tRegex(primaryIdentityPublicKeyRegex)),
    signedIdentityKeysBlob: t.maybe(signedIdentityKeysBlobValidator),
    initialNotificationsEncryptedMessage: t.maybe(t.String),
  });

export const logInResponseValidator: TInterface<LogInResponse> =
  tShape<LogInResponse>({
    currentUserInfo: t.union([
      loggedInUserInfoValidator,
      oldLoggedInUserInfoValidator,
    ]),
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: t.list(userInfoValidator),
    rawEntryInfos: t.maybe(t.list(rawEntryInfoValidator)),
    serverTime: t.Number,
    cookieChange: tShape({
      threadInfos: t.dict(tID, rawThreadInfoValidator),
      userInfos: t.list(userInfoValidator),
    }),
    notAcknowledgedPolicies: t.maybe(t.list(policyTypeValidator)),
  });

async function logInResponder(
  viewer: Viewer,
  request: LogInRequest,
): Promise<LogInResponse> {
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
  const promises = {};
  if (calendarQuery) {
    promises.verifyCalendarQueryThreadIDs =
      verifyCalendarQueryThreadIDs(calendarQuery);
  }
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
  promises.userQuery = dbQuery(userQuery);
  const {
    userQuery: [userResult],
  } = await promiseAll(promises);

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

  return await processSuccessfulLogin({
    viewer,
    input: request,
    userID: id,
    calendarQuery,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
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
): Promise<LogInResponse> {
  const {
    message,
    signature,
    deviceTokenUpdateRequest,
    platformDetails,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
    doNotRegister,
  } = request;
  const calendarQuery = normalizeCalendarQuery(request.calendarQuery);

  // 1. Ensure that `message` is a well formed Comm SIWE Auth message.
  const siweMessage: SIWEMessage = new SiweMessage(message);
  if (!isValidSIWEMessage(siweMessage)) {
    throw new ServerError('invalid_parameters');
  }

  // 2. Ensure that the `nonce` exists in the `siwe_nonces` table
  //    AND hasn't expired. If those conditions are met, delete the entry to
  //    ensure that the same `nonce` can't be re-used in a future request.
  const wasNonceCheckedAndInvalidated = await checkAndInvalidateSIWENonceEntry(
    siweMessage.nonce,
  );
  if (!wasNonceCheckedAndInvalidated) {
    throw new ServerError('invalid_parameters');
  }

  // 3. Validate SIWEMessage signature and handle possible errors.
  try {
    await siweMessage.validate(signature);
  } catch (error) {
    if (error === ErrorTypes.EXPIRED_MESSAGE) {
      // Thrown when the `expirationTime` is present and in the past.
      throw new ServerError('expired_message');
    } else if (error === ErrorTypes.INVALID_SIGNATURE) {
      // Thrown when the `validate()` function can't verify the message.
      throw new ServerError('invalid_signature');
    } else if (error === ErrorTypes.MALFORMED_SESSION) {
      // Thrown when some required field is missing.
      throw new ServerError('malformed_session');
    } else {
      throw new ServerError('unknown_error');
    }
  }

  // 4. Pull `primaryIdentityPublicKey` out from SIWEMessage `statement`.
  //    We expect it to be included for BOTH native and web clients.
  const { statement } = siweMessage;
  const primaryIdentityPublicKey =
    statement && isValidSIWEStatementWithPublicKey(statement)
      ? getPublicKeyFromSIWEStatement(statement)
      : null;
  if (!primaryIdentityPublicKey) {
    throw new ServerError('invalid_siwe_statement_public_key');
  }

  // 5. Verify `signedIdentityKeysBlob.payload` with included `signature`
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

  // 6. Ensure that `primaryIdentityPublicKeys.ed25519` matches SIWE
  //    statement `primaryIdentityPublicKey` if `identityKeys` exists.
  if (
    identityKeys &&
    identityKeys.primaryIdentityPublicKeys.ed25519 !== primaryIdentityPublicKey
  ) {
    throw new ServerError('primary_public_key_mismatch');
  }

  // 7. Construct `SIWESocialProof` object with the stringified
  //    SIWEMessage and the corresponding signature.
  const socialProof: SIWESocialProof = {
    siweMessage: siweMessage.toMessage(),
    siweMessageSignature: signature,
  };

  // 8. Create account with call to `processSIWEAccountCreation(...)`
  //    if address does not correspond to an existing user.
  let userID = await fetchUserIDForEthereumAddress(siweMessage.address);
  if (!userID && doNotRegister) {
    throw new ServerError('account_does_not_exist');
  } else if (!userID) {
    const siweAccountCreationRequest = {
      address: siweMessage.address,
      calendarQuery,
      deviceTokenUpdateRequest,
      platformDetails,
      socialProof,
    };
    userID = await processSIWEAccountCreation(
      viewer,
      siweAccountCreationRequest,
    );
  }

  // 9. Complete login with call to `processSuccessfulLogin(...)`.
  return await processSuccessfulLogin({
    viewer,
    input: request,
    userID,
    calendarQuery,
    socialProof,
    signedIdentityKeysBlob,
    initialNotificationsEncryptedMessage,
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
): Promise<LogInResponse> {
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

export const updateUserAvatarResponseValidator: TInterface<UpdateUserAvatarResponse> =
  tShape<UpdateUserAvatarResponse>({
    updates: createUpdatesResultValidator,
  });

export const updateUserAvatarResponderValidator: TUnion<
  ?ClientAvatar | UpdateUserAvatarResponse,
> = t.union([
  t.maybe(clientAvatarValidator),
  updateUserAvatarResponseValidator,
]);

async function updateUserAvatarResponder(
  viewer: Viewer,
  request: UpdateUserAvatarRequest,
): Promise<?ClientAvatar | UpdateUserAvatarResponse> {
  return await updateUserAvatar(viewer, request);
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
};
