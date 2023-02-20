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
} from '../types/account-types.js';
import type { GetSessionPublicKeysArgs } from '../types/request-types.js';
import type { UserSearchResult } from '../types/search-types.js';
import type {
  SessionPublicKeys,
  PreRequestUserState,
} from '../types/session-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types.js';
import type { UserInfo, PasswordUpdate } from '../types/user-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getConfig } from '../utils/config.js';
import sleep from '../utils/sleep.js';

const logOutActionTypes = Object.freeze({
  started: 'LOG_OUT_STARTED',
  success: 'LOG_OUT_SUCCESS',
  failed: 'LOG_OUT_FAILED',
});
const logOut =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((preRequestUserState: PreRequestUserState) => Promise<LogOutResult>) =>
  async preRequestUserState => {
    let response = null;
    try {
      response = await Promise.race([
        callServerEndpoint('log_out', {}),
        (async () => {
          await sleep(500);
          throw new Error('log_out took more than 500ms');
        })(),
      ]);
    } catch {}
    const currentUserInfo = response ? response.currentUserInfo : null;
    return { currentUserInfo, preRequestUserState };
  };

const deleteAccountActionTypes = Object.freeze({
  started: 'DELETE_ACCOUNT_STARTED',
  success: 'DELETE_ACCOUNT_SUCCESS',
  failed: 'DELETE_ACCOUNT_FAILED',
});
const deleteAccount =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    password: ?string,
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>) =>
  async (password, preRequestUserState) => {
    const response = await callServerEndpoint('delete_account', { password });
    return { currentUserInfo: response.currentUserInfo, preRequestUserState };
  };

const registerActionTypes = Object.freeze({
  started: 'REGISTER_STARTED',
  success: 'REGISTER_SUCCESS',
  failed: 'REGISTER_FAILED',
});
const registerCallServerEndpointOptions = { timeout: 60000 };
const register =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((registerInfo: RegisterInfo) => Promise<RegisterResult>) =>
  async registerInfo => {
    const response = await callServerEndpoint(
      'create_account',
      {
        ...registerInfo,
        platformDetails: getConfig().platformDetails,
      },
      registerCallServerEndpointOptions,
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
    const response = await callServerEndpoint(
      'log_in',
      {
        ...restLogInInfo,
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

const updateSubscriptionActionTypes = Object.freeze({
  started: 'UPDATE_SUBSCRIPTION_STARTED',
  success: 'UPDATE_SUBSCRIPTION_SUCCESS',
  failed: 'UPDATE_SUBSCRIPTION_FAILED',
});
const updateSubscription =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<SubscriptionUpdateResult>) =>
  async subscriptionUpdate => {
    const response = await callServerEndpoint(
      'update_user_subscription',
      subscriptionUpdate,
    );
    return {
      threadID: subscriptionUpdate.threadID,
      subscription: response.threadSubscription,
    };
  };

const setUserSettingsActionTypes = Object.freeze({
  started: 'SET_USER_SETTINGS_STARTED',
  success: 'SET_USER_SETTINGS_SUCCESS',
  failed: 'SET_USER_SETTINGS_FAILED',
});

const setUserSettings =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((userSettingsRequest: UpdateUserSettingsRequest) => Promise<void>) =>
  async userSettingsRequest => {
    await callServerEndpoint('update_user_settings', userSettingsRequest);
  };

const getSessionPublicKeys =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((data: GetSessionPublicKeysArgs) => Promise<SessionPublicKeys | null>) =>
  async data => {
    return await callServerEndpoint('get_session_public_keys', data);
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

export {
  changeUserPasswordActionTypes,
  changeUserPassword,
  deleteAccount,
  deleteAccountActionTypes,
  getSessionPublicKeys,
  mergeUserInfos,
  logIn,
  logInActionTypes,
  logOut,
  logOutActionTypes,
  register,
  registerActionTypes,
  searchUsers,
  searchUsersActionTypes,
  setUserSettings,
  setUserSettingsActionTypes,
  updateSubscription,
  updateSubscriptionActionTypes,
  policyAcknowledgment,
  policyAcknowledgmentActionTypes,
};
