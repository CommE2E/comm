// @flow

import * as React from 'react';

import {
  extractKeyserverIDFromID,
  sortThreadIDsPerKeyserver,
  sortCalendarQueryPerKeyserver,
} from '../keyserver-conn/keyserver-call-utils.js';
import { preRequestUserStateSelector } from '../selectors/account-selectors.js';
import threadWatcher from '../shared/thread-watcher.js';
import type {
  LogOutResult,
  LogInInfo,
  LogInResult,
  RegisterResult,
  RegisterInfo,
  UpdateUserSettingsRequest,
  PolicyAcknowledgmentRequest,
  ClaimUsernameResponse,
  LogInResponse,
  LogInRequest,
  KeyserverAuthResult,
  KeyserverAuthInfo,
  KeyserverAuthRequest,
} from '../types/account-types.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from '../types/avatar-types.js';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types.js';
import type { IdentityServiceClient } from '../types/identity-service-types';
import type {
  RawMessageInfo,
  MessageTruncationStatuses,
} from '../types/message-types.js';
import type {
  GetSessionPublicKeysArgs,
  GetOlmSessionInitializationDataResponse,
} from '../types/request-types.js';
import type {
  UserSearchResult,
  ExactUserSearchResult,
} from '../types/search-types.js';
import type {
  SessionPublicKeys,
  PreRequestUserState,
} from '../types/session-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types.js';
import type { RawThreadInfos } from '../types/thread-types';
import type {
  UserInfo,
  PasswordUpdate,
  LoggedOutUserInfo,
} from '../types/user-types.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import { useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const loggedOutUserInfo: LoggedOutUserInfo = {
  anonymous: true,
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
  ): ((input: PreRequestUserState) => Promise<LogOutResult>) =>
  async preRequestUserState => {
    const requests: { [string]: {} } = {};
    for (const keyserverID of allKeyserverIDs) {
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
    return { currentUserInfo, preRequestUserState };
  };

function useLogOut(): () => Promise<LogOutResult> {
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const callKeyserverLogOut = useKeyserverCall(logOut);

  return React.useCallback(
    () => callKeyserverLogOut(preRequestUserState),
    [callKeyserverLogOut, preRequestUserState],
  );
}

const claimUsernameActionTypes = Object.freeze({
  started: 'CLAIM_USERNAME_STARTED',
  success: 'CLAIM_USERNAME_SUCCESS',
  failed: 'CLAIM_USERNAME_FAILED',
});
const claimUsernameCallServerEndpointOptions = { timeout: 500 };
const claimUsername =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): (() => Promise<ClaimUsernameResponse>) =>
  async () => {
    const requests = { [ashoatKeyserverID]: {} };
    const responses = await callKeyserverEndpoint('claim_username', requests, {
      ...claimUsernameCallServerEndpointOptions,
    });
    const response = responses[ashoatKeyserverID];
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
  ): ((input: PreRequestUserState) => Promise<LogOutResult>) =>
  async preRequestUserState => {
    const requests: { [string]: {} } = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = {};
    }

    await callKeyserverEndpoint('delete_account', requests);
    return { currentUserInfo: loggedOutUserInfo, preRequestUserState };
  };

function useDeleteKeyserverAccount(): (
  input: PreRequestUserState,
) => Promise<LogOutResult> {
  return useKeyserverCall(deleteKeyserverAccount);
}

const deleteIdentityAccountActionTypes = Object.freeze({
  started: 'DELETE_IDENTITY_ACCOUNT_STARTED',
  success: 'DELETE_IDENTITY_ACCOUNT_SUCCESS',
  failed: 'DELETE_IDENTITY_ACCOUNT_FAILED',
});

function useDeleteIdentityAccount(): (
  client: IdentityServiceClient,
  deviceID: ?string,
) => Promise<void> {
  const userID = useSelector(state => state.currentUserInfo?.id);
  const accessToken = useSelector(state => state.commServicesAccessToken);
  const deleteIdentityAccount = React.useCallback(
    async (client: IdentityServiceClient, deviceID: ?string) => {
      if (!userID || !accessToken || !deviceID) {
        throw new Error('missing identity service auth metadata');
      }
      await client.deleteUser(userID, deviceID, accessToken);
    },
    [userID, accessToken],
  );

  return deleteIdentityAccount;
}

const keyserverRegisterActionTypes = Object.freeze({
  started: 'KEYSERVER_REGISTER_STARTED',
  success: 'KEYSERVER_REGISTER_SUCCESS',
  failed: 'KEYSERVER_REGISTER_FAILED',
});
const registerCallServerEndpointOptions = { timeout: 60000 };
const keyserverRegister =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    registerInfo: RegisterInfo,
    options?: CallServerEndpointOptions,
  ) => Promise<RegisterResult>) =>
  async (registerInfo, options) => {
    const deviceTokenUpdateRequest =
      registerInfo.deviceTokenUpdateRequest[ashoatKeyserverID];

    const response = await callServerEndpoint(
      'create_account',
      {
        ...registerInfo,
        deviceTokenUpdateRequest,
        platformDetails: getConfig().platformDetails,
      },
      {
        ...registerCallServerEndpointOptions,
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

const keyserverAuthActionTypes = Object.freeze({
  started: 'KEYSERVER_AUTH_STARTED',
  success: 'KEYSERVER_AUTH_SUCCESS',
  failed: 'KEYSERVER_AUTH_FAILED',
});
const keyserverAuthCallServerEndpointOptions = { timeout: 60000 };
const keyserverAuth =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: KeyserverAuthInfo) => Promise<KeyserverAuthResult>) =>
  async keyserverAuthInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();

    const {
      logInActionSource,
      calendarQuery,
      keyserverData,
      deviceTokenUpdateInput,
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
        source: logInActionSource,
      };
    }

    const responses: { +[string]: LogInResponse } = await callKeyserverEndpoint(
      'keyserver_auth',
      requests,
      keyserverAuthCallServerEndpointOptions,
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
      currentUserInfo: responses[ashoatKeyserverID].currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      logInActionSource: keyserverAuthInfo.logInActionSource,
      notAcknowledgedPolicies:
        responses[ashoatKeyserverID].notAcknowledgedPolicies,
    };
  };

function useKeyserverAuth(): (
  input: KeyserverAuthInfo,
) => Promise<KeyserverAuthResult> {
  return useKeyserverCall(keyserverAuth);
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

const tempIdentityLoginActionTypes = Object.freeze({
  started: 'TEMP_IDENTITY_LOG_IN_STARTED',
  success: 'TEMP_IDENTITY_LOG_IN_SUCCESS',
  failed: 'TEMP_IDENTITY_LOG_IN_FAILED',
});

const logInActionTypes = Object.freeze({
  started: 'LOG_IN_STARTED',
  success: 'LOG_IN_SUCCESS',
  failed: 'LOG_IN_FAILED',
});
const logInCallServerEndpointOptions = { timeout: 60000 };
const logIn =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: LogInInfo) => Promise<LogInResult>) =>
  async logInInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const {
      logInActionSource,
      calendarQuery,
      keyserverIDs: inputKeyserverIDs,
      ...restLogInInfo
    } = logInInfo;

    // Eventually the list of keyservers will be fetched from the
    // identity service
    const keyserverIDs = inputKeyserverIDs ?? [ashoatKeyserverID];

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
        source: logInActionSource,
        watchedIDs: watchedIDsPerKeyserver[keyserverID] ?? [],
        calendarQuery: calendarQueryPerKeyserver[keyserverID],
        platformDetails: getConfig().platformDetails,
      };
    }

    const responses: { +[string]: LogInResponse } = await callKeyserverEndpoint(
      'log_in',
      requests,
      logInCallServerEndpointOptions,
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
      currentUserInfo: responses[ashoatKeyserverID].currentUserInfo,
      calendarResult,
      messagesResult,
      userInfos,
      updatesCurrentAsOf,
      logInActionSource: logInInfo.logInActionSource,
      notAcknowledgedPolicies:
        responses[ashoatKeyserverID].notAcknowledgedPolicies,
    };
  };

function useLogIn(): (input: LogInInfo) => Promise<LogInResult> {
  return useKeyserverCall(logIn);
}

const changeUserPasswordActionTypes = Object.freeze({
  started: 'CHANGE_USER_PASSWORD_STARTED',
  success: 'CHANGE_USER_PASSWORD_SUCCESS',
  failed: 'CHANGE_USER_PASSWORD_FAILED',
});
const changeUserPassword =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((passwordUpdate: PasswordUpdate) => Promise<void>) =>
  async passwordUpdate => {
    await callServerEndpoint('update_account', passwordUpdate);
  };

const searchUsersActionTypes = Object.freeze({
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
const searchUsers =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((usernamePrefix: string) => Promise<UserSearchResult>) =>
  async usernamePrefix => {
    const response = await callServerEndpoint('search_users', {
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
    callServerEndpoint: CallServerEndpoint,
  ): ((username: string) => Promise<ExactUserSearchResult>) =>
  async username => {
    const response = await callServerEndpoint('exact_search_user', {
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

const getSessionPublicKeys =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((data: GetSessionPublicKeysArgs) => Promise<SessionPublicKeys | null>) =>
  async data => {
    return await callServerEndpoint('get_session_public_keys', data);
  };

const getOlmSessionInitializationDataActionTypes = Object.freeze({
  started: 'GET_OLM_SESSION_INITIALIZATION_DATA_STARTED',
  success: 'GET_OLM_SESSION_INITIALIZATION_DATA_SUCCESS',
  failed: 'GET_OLM_SESSION_INITIALIZATION_DATA_FAILED',
});

const getOlmSessionInitializationData =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    options?: ?CallServerEndpointOptions,
  ) => Promise<GetOlmSessionInitializationDataResponse>) =>
  async options => {
    return await callServerEndpoint(
      'get_olm_session_initialization_data',
      {},
      options,
    );
  };

const policyAcknowledgmentActionTypes = Object.freeze({
  started: 'POLICY_ACKNOWLEDGMENT_STARTED',
  success: 'POLICY_ACKNOWLEDGMENT_SUCCESS',
  failed: 'POLICY_ACKNOWLEDGMENT_FAILED',
});
const policyAcknowledgment =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((policyRequest: PolicyAcknowledgmentRequest) => Promise<void>) =>
  async policyRequest => {
    await callServerEndpoint('policy_acknowledgment', policyRequest);
  };

const updateUserAvatarActionTypes = Object.freeze({
  started: 'UPDATE_USER_AVATAR_STARTED',
  success: 'UPDATE_USER_AVATAR_SUCCESS',
  failed: 'UPDATE_USER_AVATAR_FAILED',
});
const updateUserAvatar =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    avatarDBContent: UpdateUserAvatarRequest,
  ) => Promise<UpdateUserAvatarResponse>) =>
  async avatarDBContent => {
    const { updates }: UpdateUserAvatarResponse = await callServerEndpoint(
      'update_user_avatar',
      avatarDBContent,
    );
    return { updates };
  };

const resetUserStateActionType = 'RESET_USER_STATE';

const setAccessTokenActionType = 'SET_ACCESS_TOKEN';

export {
  changeUserPasswordActionTypes,
  changeUserPassword,
  claimUsernameActionTypes,
  useClaimUsername,
  useDeleteKeyserverAccount,
  deleteKeyserverAccountActionTypes,
  getSessionPublicKeys,
  getOlmSessionInitializationDataActionTypes,
  getOlmSessionInitializationData,
  mergeUserInfos,
  logIn as logInRawAction,
  tempIdentityLoginActionTypes,
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
  resetUserStateActionType,
  setAccessTokenActionType,
  deleteIdentityAccountActionTypes,
  useDeleteIdentityAccount,
  keyserverAuthActionTypes,
  useKeyserverAuth,
};
