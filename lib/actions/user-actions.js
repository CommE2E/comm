// @flow

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
} from '../types/account-types.js';
import type {
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from '../types/avatar-types.js';
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
import type {
  UserInfo,
  PasswordUpdate,
  LoggedOutUserInfo,
} from '../types/user-types.js';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import type {
  CallServerEndpoint,
  CallServerEndpointOptions,
} from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call';
import { useKeyserverCall } from '../utils/keyserver-call.js';
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
    const requests = {};
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

function useLogOut(): (input: PreRequestUserState) => Promise<LogOutResult> {
  return useKeyserverCall(logOut);
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

const deleteAccountActionTypes = Object.freeze({
  started: 'DELETE_ACCOUNT_STARTED',
  success: 'DELETE_ACCOUNT_SUCCESS',
  failed: 'DELETE_ACCOUNT_FAILED',
});
const deleteAccount =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: PreRequestUserState) => Promise<LogOutResult>) =>
  async preRequestUserState => {
    const requests = {};
    for (const keyserverID of allKeyserverIDs) {
      requests[keyserverID] = {};
    }

    await callKeyserverEndpoint('delete_account', requests);
    return { currentUserInfo: loggedOutUserInfo, preRequestUserState };
  };

function useDeleteAccount(): (
  input: PreRequestUserState,
) => Promise<LogOutResult> {
  return useKeyserverCall(deleteAccount);
}

const registerActionTypes = Object.freeze({
  started: 'REGISTER_STARTED',
  success: 'REGISTER_SUCCESS',
  failed: 'REGISTER_FAILED',
});
const registerCallServerEndpointOptions = { timeout: 60000 };
const register =
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

function mergeUserInfos(...userInfoArrays: UserInfo[][]): UserInfo[] {
  const merged = {};
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

const logInActionTypes = Object.freeze({
  started: 'LOG_IN_STARTED',
  success: 'LOG_IN_SUCCESS',
  failed: 'LOG_IN_FAILED',
});
const logInCallServerEndpointOptions = { timeout: 60000 };
const logIn =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((logInInfo: LogInInfo) => Promise<LogInResult>) =>
  async logInInfo => {
    const watchedIDs = threadWatcher.getWatchedIDs();
    const { logInActionSource, ...restLogInInfo } = logInInfo;

    const deviceTokenUpdateRequest =
      logInInfo.deviceTokenUpdateRequest[ashoatKeyserverID];

    const response = await callServerEndpoint(
      'log_in',
      {
        ...restLogInInfo,
        deviceTokenUpdateRequest,
        source: logInActionSource,
        watchedIDs,
        platformDetails: getConfig().platformDetails,
      },
      logInCallServerEndpointOptions,
    );
    const userInfos = mergeUserInfos(
      response.userInfos,
      response.cookieChange.userInfos,
    );
    return {
      threadInfos: response.cookieChange.threadInfos,
      currentUserInfo: response.currentUserInfo,
      calendarResult: {
        calendarQuery: logInInfo.calendarQuery,
        rawEntryInfos: response.rawEntryInfos,
      },
      messagesResult: {
        messageInfos: response.rawMessageInfos,
        truncationStatus: response.truncationStatuses,
        watchedIDsAtRequestTime: watchedIDs,
        currentAsOf: response.serverTime,
      },
      userInfos,
      updatesCurrentAsOf: response.serverTime,
      logInActionSource: logInInfo.logInActionSource,
      notAcknowledgedPolicies: response.notAcknowledgedPolicies,
    };
  };

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
    const requests = {};
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
  useDeleteAccount,
  deleteAccountActionTypes,
  getSessionPublicKeys,
  getOlmSessionInitializationDataActionTypes,
  getOlmSessionInitializationData,
  mergeUserInfos,
  logIn,
  logInActionTypes,
  useLogOut,
  logOutActionTypes,
  register,
  registerActionTypes,
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
};
