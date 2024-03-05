// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
  sortCalendarQueryPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { preRequestUserStateSelector } from '../selectors/account-selectors.js';
import { getOneTimeKeyValuesFromBlob } from '../shared/crypto-utils.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import threadWatcher from '../shared/thread-watcher.js';
import type {
  LogInInfo,
  LogInResult,
  RegisterResult,
  RegisterInfo,
  UpdateUserSettingsRequest,
  PolicyAcknowledgmentRequest,
  ClaimUsernameResponse,
  LogInRequest,
  KeyserverAuthResult,
  KeyserverAuthInfo,
  KeyserverAuthRequest,
  ClientLogInResponse,
  KeyserverLogOutResult,
  LogOutResult,
} from '../types/account-types.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from '../types/avatar-types.js';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types.js';
import type { IdentityAuthResult } from '../types/identity-service-types.js';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from '../types/message-types.js';
import type { GetOlmSessionInitializationDataResponse } from '../types/request-types.js';
import type {
  UserSearchResult,
  ExactUserSearchResult,
} from '../types/search-types.js';
import type { PreRequestUserState } from '../types/session-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types.js';
import type { RawThreadInfos } from '../types/thread-types';
import type {
  CurrentUserInfo,
  UserInfo,
  PasswordUpdate,
  LoggedOutUserInfo,
} from '../types/user-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import type {
  CallSingleKeyserverEndpoint,
  CallSingleKeyserverEndpointOptions,
} from '../utils/call-single-keyserver-endpoint.js';
import { getConfig } from '../utils/config.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';
import sleep from '../utils/sleep.js';

const loggedOutUserInfo: LoggedOutUserInfo = {
  anonymous: true,
};

export type KeyserverLogOutInput = {
  +preRequestUserState: PreRequestUserState,
  +keyserverIDs?: $ReadOnlyArray<string>,
};

const logOutActionTypes = Object.freeze({
  started: 'LOG_OUT_STARTED',
  success: 'LOG_OUT_SUCCESS',
  failed: 'LOG_OUT_FAILED',
});
const logOut =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: KeyserverLogOutInput) => Promise<KeyserverLogOutResult>) =>
  async input => {
    const { preRequestUserState } = input;
    const keyserverIDs = input.keyserverIDs ?? allKeyserverIDs;
    const requests: { [string]: {} } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {};
    }

    let response = null;
    try {
      response = await Promise.race([
        callKeyserverEndpoint('log_out', requests),
        (async () => {
          await sleep(500);
          throw new Error('log_out took more than 500ms');
        })(),
      ]);
    } catch {}
    const currentUserInfo = response ? loggedOutUserInfo : null;
    return { currentUserInfo, preRequestUserState, keyserverIDs };
  };

function useLogOut(): (
  keyserverIDs?: $ReadOnlyArray<string>,
) => Promise<LogOutResult> {
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const callKeyserverLogOut = useKeyserverCall(logOut);

  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(
    async (keyserverIDs?: $ReadOnlyArray<string>) => {
      const { keyserverIDs: _, ...result } = await callKeyserverLogOut({
        preRequestUserState,
        keyserverIDs,
      });
      return {
        ...result,
        preRequestUserState: {
          ...result.preRequestUserState,
          commServicesAccessToken,
        },
      };
    },
    [callKeyserverLogOut, commServicesAccessToken, preRequestUserState],
  );
}

const claimUsernameActionTypes = Object.freeze({
  started: 'CLAIM_USERNAME_STARTED',
  success: 'CLAIM_USERNAME_SUCCESS',
  failed: 'CLAIM_USERNAME_FAILED',
});
const claimUsernameCallSingleKeyserverEndpointOptions = { timeout: 500 };
const claimUsername =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): (() => Promise<ClaimUsernameResponse>) =>
  async () => {
    const requests = { [authoritativeKeyserverID()]: {} };
    const responses = await callKeyserverEndpoint('claim_username', requests, {
      ...claimUsernameCallSingleKeyserverEndpointOptions,
    });
    const response = responses[authoritativeKeyserverID()];
    return {
      message: response.message,
      signature: response.signature,
    };
  };

function useClaimUsername(): () => Promise<ClaimUsernameResponse> {
  return useKeyserverCall(claimUsername);
}

const deleteKeyserverAccountActionTypes = Object.freeze({
  started: 'DELETE_KEYSERVER_ACCOUNT_STARTED',
  success: 'DELETE_KEYSERVER_ACCOUNT_SUCCESS',
  failed: 'DELETE_KEYSERVER_ACCOUNT_FAILED',
});
const deleteKeyserverAccount =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: KeyserverLogOutInput) => Promise<KeyserverLogOutResult>) =>
  async input => {
    const { preRequestUserState } = input;
    const keyserverIDs = input.keyserverIDs ?? allKeyserverIDs;
    const requests: { [string]: {} } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {};
    }

    await callKeyserverEndpoint('delete_account', requests);
    return {
      currentUserInfo: loggedOutUserInfo,
      preRequestUserState,
      keyserverIDs,
    };
  };

function useDeleteKeyserverAccount(): (
  keyserverIDs?: $ReadOnlyArray<string>,
) => Promise<KeyserverLogOutResult> {
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const callKeyserverDeleteAccount = useKeyserverCall(deleteKeyserverAccount);

  return React.useCallback(
    (keyserverIDs?: $ReadOnlyArray<string>) =>
      callKeyserverDeleteAccount({ preRequestUserState, keyserverIDs }),
    [callKeyserverDeleteAccount, preRequestUserState],
  );
}

const deleteAccountActionTypes = Object.freeze({
  started: 'DELETE_ACCOUNT_STARTED',
  success: 'DELETE_ACCOUNT_SUCCESS',
  failed: 'DELETE_ACCOUNT_FAILED',
});

function useDeleteAccount(): () => Promise<LogOutResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;

  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const callKeyserverDeleteAccount = useKeyserverCall(deleteKeyserverAccount);

  const commServicesAccessToken = useSelector(
    state => state.commServicesAccessToken,
  );

  return React.useCallback(async () => {
    const identityPromise = (async () => {
      if (!usingCommServicesAccessToken) {
        return undefined;
      }
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      return await identityClient.deleteUser();
    })();
    const [keyserverResult] = await Promise.all([
      callKeyserverDeleteAccount({
        preRequestUserState,
      }),
      identityPromise,
    ]);
    const { keyserverIDs: _, ...result } = keyserverResult;
    return {
      ...result,
      preRequestUserState: {
        ...result.preRequestUserState,
        commServicesAccessToken,
      },
    };
  }, [
    callKeyserverDeleteAccount,
    commServicesAccessToken,
    identityClient,
    preRequestUserState,
  ]);
}

const keyserverRegisterActionTypes = Object.freeze({
  started: 'KEYSERVER_REGISTER_STARTED',
  success: 'KEYSERVER_REGISTER_SUCCESS',
  failed: 'KEYSERVER_REGISTER_FAILED',
});
const registerCallSingleKeyserverEndpointOptions = { timeout: 60000 };
const keyserverRegister =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    registerInfo: RegisterInfo,
    options?: CallSingleKeyserverEndpointOptions,
  ) => Promise<RegisterResult>) =>
  async (registerInfo, options) => {
    const deviceTokenUpdateRequest =
      registerInfo.deviceTokenUpdateRequest[authoritativeKeyserverID()];

    const response = await callSingleKeyserverEndpoint(
      'create_account',
      {
        ...registerInfo,
        deviceTokenUpdateRequest,
        platformDetails: getConfig().platformDetails,
      },
      {
        ...registerCallSingleKeyserverEndpointOptions,
        ...options,
      },
    );
    return {
      currentUserInfo: response.currentUserInfo,
      rawMessageInfos: response.rawMessageInfos,
      threadInfos: response.cookieChange.threadInfos,
      userInfos: response.cookieChange.userInfos,
      calendarQuery: registerInfo.calendarQuery,
    };
  };

export type KeyserverAuthInput = $ReadOnly<{
  ...KeyserverAuthInfo,
  +preRequestUserInfo: ?CurrentUserInfo,
}>;

const keyserverAuthActionTypes = Object.freeze({
  started: 'KEYSERVER_AUTH_STARTED',
  success: 'KEYSERVER_AUTH_SUCCESS',
  failed: 'KEYSERVER_AUTH_FAILED',
});
const keyserverAuthCallSingleKeyserverEndpointOptions = { timeout: 60000 };
const keyserverAuth =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: KeyserverAuthInput) => Promise<KeyserverAuthResult>) =>
  async keyserverAuthInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();

    const {
      authActionSource,
      calendarQuery,
      keyserverData,
      deviceTokenUpdateInput,
      preRequestUserInfo,
      ...restLogInInfo
    } = keyserverAuthInfo;

    const keyserverIDs = Object.keys(keyserverData);

    const watchedIDsPerKeyserver = sortThreadIDsPerKeyserver(watchedIDs);
    const calendarQueryPerKeyserver = sortCalendarQueryPerKeyserver(
      calendarQuery,
      keyserverIDs,
    );

    const requests: { [string]: KeyserverAuthRequest } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {
        ...restLogInInfo,
        deviceTokenUpdateRequest: deviceTokenUpdateInput[keyserverID],
        watchedIDs: watchedIDsPerKeyserver[keyserverID] ?? [],
        calendarQuery: calendarQueryPerKeyserver[keyserverID],
        platformDetails: getConfig().platformDetails,
        initialContentEncryptedMessage:
          keyserverData[keyserverID].initialContentEncryptedMessage,
        initialNotificationsEncryptedMessage:
          keyserverData[keyserverID].initialNotificationsEncryptedMessage,
        source: authActionSource,
      };
    }

    const responses: { +[string]: ClientLogInResponse } =
      await callKeyserverEndpoint(
        'keyserver_auth',
        requests,
        keyserverAuthCallSingleKeyserverEndpointOptions,
      );

    const userInfosArrays = [];

    let threadInfos: RawThreadInfos = {};
    const calendarResult: WritableCalendarResult = {
      calendarQuery: keyserverAuthInfo.calendarQuery,
      rawEntryInfos: [],
    };
    const messagesResult: WritableGenericMessagesResult = {
      messageInfos: [],
      truncationStatus: {},
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: {},
    };
    let updatesCurrentAsOf: { +[string]: number } = {};
    for (const keyserverID in responses) {
      threadInfos = {
        ...responses[keyserverID].cookieChange.threadInfos,
        ...threadInfos,
      };
      if (responses[keyserverID].rawEntryInfos) {
        calendarResult.rawEntryInfos = calendarResult.rawEntryInfos.concat(
          responses[keyserverID].rawEntryInfos,
        );
      }
      messagesResult.messageInfos = messagesResult.messageInfos.concat(
        responses[keyserverID].rawMessageInfos,
      );
      messagesResult.truncationStatus = {
        ...messagesResult.truncationStatus,
        ...responses[keyserverID].truncationStatuses,
      };
      messagesResult.currentAsOf = {
        ...messagesResult.currentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      updatesCurrentAsOf = {
        ...updatesCurrentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      userInfosArrays.push(responses[keyserverID].userInfos);
      userInfosArrays.push(responses[keyserverID].cookieChange.userInfos);
    }

    const userInfos = mergeUserInfos(...userInfosArrays);

    return {
      threadInfos,
      currentUserInfo: responses[authoritativeKeyserverID()]?.currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      authActionSource: keyserverAuthInfo.authActionSource,
      notAcknowledgedPolicies:
        responses[authoritativeKeyserverID()].notAcknowledgedPolicies,
      preRequestUserInfo,
    };
  };

function useKeyserverAuth(): (
  input: KeyserverAuthInfo,
) => Promise<KeyserverAuthResult> {
  const preRequestUserInfo = useSelector(state => state.currentUserInfo);
  const callKeyserverAuth = useKeyserverCall(keyserverAuth);

  return React.useCallback(
    (input: KeyserverAuthInfo) =>
      callKeyserverAuth({ preRequestUserInfo, ...input }),
    [callKeyserverAuth, preRequestUserInfo],
  );
}

const identityRegisterActionTypes = Object.freeze({
  started: 'IDENTITY_REGISTER_STARTED',
  success: 'IDENTITY_REGISTER_SUCCESS',
  failed: 'IDENTITY_REGISTER_FAILED',
});
function useIdentityPasswordRegister(): (
  username: string,
  password: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  if (!identityClient.registerPasswordUser) {
    throw new Error('Register password user method unimplemented');
  }
  return identityClient.registerPasswordUser;
}
function useIdentityWalletRegister(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  if (!identityClient.registerWalletUser) {
    throw new Error('Register wallet user method unimplemented');
  }
  return identityClient.registerWalletUser;
}

const identityGenerateNonceActionTypes = Object.freeze({
  started: 'IDENTITY_GENERATE_NONCE_STARTED',
  success: 'IDENTITY_GENERATE_NONCE_SUCCESS',
  failed: 'IDENTITY_GENERATE_NONCE_FAILED',
});
function useIdentityGenerateNonce(): () => Promise<string> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return identityClient.generateNonce;
}

function mergeUserInfos(
  ...userInfoArrays: Array<$ReadOnlyArray<UserInfo>>
): UserInfo[] {
  const merged: { [string]: UserInfo } = {};
  for (const userInfoArray of userInfoArrays) {
    for (const userInfo of userInfoArray) {
      merged[userInfo.id] = userInfo;
    }
  }
  const flattened = [];
  for (const id in merged) {
    flattened.push(merged[id]);
  }
  return flattened;
}

type WritableGenericMessagesResult = {
  messageInfos: RawMessageInfo[],
  truncationStatus: MessageTruncationStatuses,
  watchedIDsAtRequestTime: string[],
  currentAsOf: { [keyserverID: string]: number },
};
type WritableCalendarResult = {
  rawEntryInfos: RawEntryInfo[],
  calendarQuery: CalendarQuery,
};

const identityLogInActionTypes = Object.freeze({
  started: 'IDENTITY_LOG_IN_STARTED',
  success: 'IDENTITY_LOG_IN_SUCCESS',
  failed: 'IDENTITY_LOG_IN_FAILED',
});
function useIdentityPasswordLogIn(): (
  username: string,
  password: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  return React.useCallback(
    (username, password) => {
      if (!identityClient) {
        throw new Error('Identity service client is not initialized');
      }
      return identityClient.logInPasswordUser(username, password);
    },
    [identityClient],
  );
}
function useIdentityWalletLogIn(): (
  walletAddress: string,
  siweMessage: string,
  siweSignature: string,
) => Promise<IdentityAuthResult> {
  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  return identityClient.logInWalletUser;
}

const logInActionTypes = Object.freeze({
  started: 'LOG_IN_STARTED',
  success: 'LOG_IN_SUCCESS',
  failed: 'LOG_IN_FAILED',
});
const logInCallSingleKeyserverEndpointOptions = { timeout: 60000 };
const logIn =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: LogInInfo) => Promise<LogInResult>) =>
  async logInInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const {
      authActionSource,
      calendarQuery,
      keyserverIDs: inputKeyserverIDs,
      ...restLogInInfo
    } = logInInfo;

    // Eventually the list of keyservers will be fetched from the
    // identity service
    const keyserverIDs = inputKeyserverIDs ?? [authoritativeKeyserverID()];

    const watchedIDsPerKeyserver = sortThreadIDsPerKeyserver(watchedIDs);
    const calendarQueryPerKeyserver = sortCalendarQueryPerKeyserver(
      calendarQuery,
      keyserverIDs,
    );

    const requests: { [string]: LogInRequest } = {};
    for (const keyserverID of keyserverIDs) {
      requests[keyserverID] = {
        ...restLogInInfo,
        deviceTokenUpdateRequest:
          logInInfo.deviceTokenUpdateRequest[keyserverID],
        source: authActionSource,
        watchedIDs: watchedIDsPerKeyserver[keyserverID] ?? [],
        calendarQuery: calendarQueryPerKeyserver[keyserverID],
        platformDetails: getConfig().platformDetails,
      };
    }

    const responses: { +[string]: ClientLogInResponse } =
      await callKeyserverEndpoint(
        'log_in',
        requests,
        logInCallSingleKeyserverEndpointOptions,
      );

    const userInfosArrays = [];

    let threadInfos: RawThreadInfos = {};
    const calendarResult: WritableCalendarResult = {
      calendarQuery: logInInfo.calendarQuery,
      rawEntryInfos: [],
    };
    const messagesResult: WritableGenericMessagesResult = {
      messageInfos: [],
      truncationStatus: {},
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: {},
    };
    let updatesCurrentAsOf: { +[string]: number } = {};
    for (const keyserverID in responses) {
      threadInfos = {
        ...responses[keyserverID].cookieChange.threadInfos,
        ...threadInfos,
      };
      if (responses[keyserverID].rawEntryInfos) {
        calendarResult.rawEntryInfos = calendarResult.rawEntryInfos.concat(
          responses[keyserverID].rawEntryInfos,
        );
      }
      messagesResult.messageInfos = messagesResult.messageInfos.concat(
        responses[keyserverID].rawMessageInfos,
      );
      messagesResult.truncationStatus = {
        ...messagesResult.truncationStatus,
        ...responses[keyserverID].truncationStatuses,
      };
      messagesResult.currentAsOf = {
        ...messagesResult.currentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      updatesCurrentAsOf = {
        ...updatesCurrentAsOf,
        [keyserverID]: responses[keyserverID].serverTime,
      };
      userInfosArrays.push(responses[keyserverID].userInfos);
      userInfosArrays.push(responses[keyserverID].cookieChange.userInfos);
    }

    const userInfos = mergeUserInfos(...userInfosArrays);

    return {
      threadInfos,
      currentUserInfo: responses[authoritativeKeyserverID()].currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      authActionSource: logInInfo.authActionSource,
      notAcknowledgedPolicies:
        responses[authoritativeKeyserverID()].notAcknowledgedPolicies,
    };
  };

function useLogIn(): (input: LogInInfo) => Promise<LogInResult> {
  return useKeyserverCall(logIn);
}

const changeKeyserverUserPasswordActionTypes = Object.freeze({
  started: 'CHANGE_KEYSERVER_USER_PASSWORD_STARTED',
  success: 'CHANGE_KEYSERVER_USER_PASSWORD_SUCCESS',
  failed: 'CHANGE_KEYSERVER_USER_PASSWORD_FAILED',
});
const changeKeyserverUserPassword =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((passwordUpdate: PasswordUpdate) => Promise<void>) =>
  async passwordUpdate => {
    await callSingleKeyserverEndpoint('update_account', passwordUpdate);
  };

const searchUsersActionTypes = Object.freeze({
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
const searchUsers =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((usernamePrefix: string) => Promise<UserSearchResult>) =>
  async usernamePrefix => {
    const response = await callSingleKeyserverEndpoint('search_users', {
      prefix: usernamePrefix,
    });
    return {
      userInfos: response.userInfos,
    };
  };

const exactSearchUserActionTypes = Object.freeze({
  started: 'EXACT_SEARCH_USER_STARTED',
  success: 'EXACT_SEARCH_USER_SUCCESS',
  failed: 'EXACT_SEARCH_USER_FAILED',
});
const exactSearchUser =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((username: string) => Promise<ExactUserSearchResult>) =>
  async username => {
    const response = await callSingleKeyserverEndpoint('exact_search_user', {
      username,
    });
    return {
      userInfo: response.userInfo,
    };
  };

const updateSubscriptionActionTypes = Object.freeze({
  started: 'UPDATE_SUBSCRIPTION_STARTED',
  success: 'UPDATE_SUBSCRIPTION_SUCCESS',
  failed: 'UPDATE_SUBSCRIPTION_FAILED',
});
const updateSubscription =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((
    input: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>) =>
  async input => {
    const keyserverID = extractKeyserverIDFromID(input.threadID);
    const requests = { [keyserverID]: input };

    const responses = await callKeyserverEndpoint(
      'update_user_subscription',
      requests,
    );
    const response = responses[keyserverID];
    return {
      threadID: input.threadID,
      subscription: response.threadSubscription,
    };
  };

function useUpdateSubscription(): (
  input: SubscriptionUpdateRequest,
) => Promise<SubscriptionUpdateResult> {
  return useKeyserverCall(updateSubscription);
}

const setUserSettingsActionTypes = Object.freeze({
  started: 'SET_USER_SETTINGS_STARTED',
  success: 'SET_USER_SETTINGS_SUCCESS',
  failed: 'SET_USER_SETTINGS_FAILED',
});

const setUserSettings =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: UpdateUserSettingsRequest) => Promise<void>) =>
  async input => {
    const requests: { [string]: UpdateUserSettingsRequest } = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = input;
    }
    await callKeyserverEndpoint('update_user_settings', requests);
  };

function useSetUserSettings(): (
  input: UpdateUserSettingsRequest,
) => Promise<void> {
  return useKeyserverCall(setUserSettings);
}

const getOlmSessionInitializationDataActionTypes = Object.freeze({
  started: 'GET_OLM_SESSION_INITIALIZATION_DATA_STARTED',
  success: 'GET_OLM_SESSION_INITIALIZATION_DATA_SUCCESS',
  failed: 'GET_OLM_SESSION_INITIALIZATION_DATA_FAILED',
});

const getOlmSessionInitializationData =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    options?: ?CallSingleKeyserverEndpointOptions,
  ) => Promise<GetOlmSessionInitializationDataResponse>) =>
  async options => {
    const olmInitData = await callSingleKeyserverEndpoint(
      'get_olm_session_initialization_data',
      {},
      options,
    );
    return {
      signedIdentityKeysBlob: olmInitData.signedIdentityKeysBlob,
      contentInitializationInfo: {
        ...olmInitData.contentInitializationInfo,
        oneTimeKey: getOneTimeKeyValuesFromBlob(
          olmInitData.contentInitializationInfo.oneTimeKey,
        )[0],
      },
      notifInitializationInfo: {
        ...olmInitData.notifInitializationInfo,
        oneTimeKey: getOneTimeKeyValuesFromBlob(
          olmInitData.notifInitializationInfo.oneTimeKey,
        )[0],
      },
    };
  };

const policyAcknowledgmentActionTypes = Object.freeze({
  started: 'POLICY_ACKNOWLEDGMENT_STARTED',
  success: 'POLICY_ACKNOWLEDGMENT_SUCCESS',
  failed: 'POLICY_ACKNOWLEDGMENT_FAILED',
});
const policyAcknowledgment =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((policyRequest: PolicyAcknowledgmentRequest) => Promise<void>) =>
  async policyRequest => {
    await callSingleKeyserverEndpoint('policy_acknowledgment', policyRequest);
  };

const updateUserAvatarActionTypes = Object.freeze({
  started: 'UPDATE_USER_AVATAR_STARTED',
  success: 'UPDATE_USER_AVATAR_SUCCESS',
  failed: 'UPDATE_USER_AVATAR_FAILED',
});
const updateUserAvatar =
  (
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
  ): ((
    avatarDBContent: UpdateUserAvatarRequest,
  ) => Promise<UpdateUserAvatarResponse>) =>
  async avatarDBContent => {
    const { updates }: UpdateUserAvatarResponse =
      await callSingleKeyserverEndpoint('update_user_avatar', avatarDBContent);
    return { updates };
  };

const setAccessTokenActionType = 'SET_ACCESS_TOKEN';

export {
  changeKeyserverUserPasswordActionTypes,
  changeKeyserverUserPassword,
  claimUsernameActionTypes,
  useClaimUsername,
  useDeleteKeyserverAccount,
  deleteKeyserverAccountActionTypes,
  getOlmSessionInitializationDataActionTypes,
  getOlmSessionInitializationData,
  mergeUserInfos,
  logIn as logInRawAction,
  identityLogInActionTypes,
  useIdentityPasswordLogIn,
  useIdentityWalletLogIn,
  useLogIn,
  logInActionTypes,
  useLogOut,
  logOutActionTypes,
  keyserverRegister,
  keyserverRegisterActionTypes,
  searchUsers,
  searchUsersActionTypes,
  exactSearchUser,
  exactSearchUserActionTypes,
  useSetUserSettings,
  setUserSettingsActionTypes,
  useUpdateSubscription,
  updateSubscriptionActionTypes,
  policyAcknowledgment,
  policyAcknowledgmentActionTypes,
  updateUserAvatarActionTypes,
  updateUserAvatar,
  setAccessTokenActionType,
  deleteAccountActionTypes,
  useDeleteAccount,
  keyserverAuthActionTypes,
  useKeyserverAuth,
  identityRegisterActionTypes,
  useIdentityPasswordRegister,
  useIdentityWalletRegister,
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
};
