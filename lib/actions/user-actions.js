// @flow

import threadWatcher from '../shared/thread-watcher';
import type {
  LogOutResult,
  LogInInfo,
  LogInResult,
  RegisterResult,
  RegisterInfo,
  AccessRequest,
  UpdateUserSettingsRequest,
} from '../types/account-types';
import type { GetUserPublicKeysArgs } from '../types/request-types';
import type { UserSearchResult } from '../types/search-types';
import type { PreRequestUserState } from '../types/session-types';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types';
import type {
  UserPublicKeys,
  UserInfo,
  AccountUpdate,
} from '../types/user-types';
import { getConfig } from '../utils/config';
import type { FetchJSON } from '../utils/fetch-json';
import sleep from '../utils/sleep';

const logOutActionTypes = Object.freeze({
  started: 'LOG_OUT_STARTED',
  success: 'LOG_OUT_SUCCESS',
  failed: 'LOG_OUT_FAILED',
});
const logOut = (
  fetchJSON: FetchJSON,
): ((
  preRequestUserState: PreRequestUserState,
) => Promise<LogOutResult>) => async preRequestUserState => {
  let response = null;
  try {
    response = await Promise.race([
      fetchJSON('log_out', {}),
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
const deleteAccount = (
  fetchJSON: FetchJSON,
): ((
  password: string,
  preRequestUserState: PreRequestUserState,
) => Promise<LogOutResult>) => async (password, preRequestUserState) => {
  const response = await fetchJSON('delete_account', { password });
  return { currentUserInfo: response.currentUserInfo, preRequestUserState };
};

const registerActionTypes = Object.freeze({
  started: 'REGISTER_STARTED',
  success: 'REGISTER_SUCCESS',
  failed: 'REGISTER_FAILED',
});
const register = (
  fetchJSON: FetchJSON,
): ((
  registerInfo: RegisterInfo,
) => Promise<RegisterResult>) => async registerInfo => {
  const response = await fetchJSON('create_account', {
    ...registerInfo,
    platformDetails: getConfig().platformDetails,
  });
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

const cookieInvalidationResolutionAttempt =
  'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT';
const appStartNativeCredentialsAutoLogIn =
  'APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN';
const appStartReduxLoggedInButInvalidCookie =
  'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE';
const socketAuthErrorResolutionAttempt = 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT';
const sqliteOpFailure = 'SQLITE_OP_FAILURE';
const sqliteLoadFailure = 'SQLITE_LOAD_FAILURE';

const logInActionTypes = Object.freeze({
  started: 'LOG_IN_STARTED',
  success: 'LOG_IN_SUCCESS',
  failed: 'LOG_IN_FAILED',
});
const logInFetchJSONOptions = { timeout: 60000 };
const logIn = (
  fetchJSON: FetchJSON,
): ((logInInfo: LogInInfo) => Promise<LogInResult>) => async logInInfo => {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const { source, ...restLogInInfo } = logInInfo;
  const response = await fetchJSON(
    'log_in',
    {
      ...restLogInInfo,
      watchedIDs,
      platformDetails: getConfig().platformDetails,
    },
    logInFetchJSONOptions,
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
    source,
  };
};

const changeUserSettingsActionTypes = Object.freeze({
  started: 'CHANGE_USER_PASSWORD_SETTINGS_STARTED',
  success: 'CHANGE_USER_PASSWORD_SETTINGS_SUCCESS',
  failed: 'CHANGE_USER_PASSWORD_SETTINGS_FAILED',
});
const changeUserSettings = (
  fetchJSON: FetchJSON,
): ((accountUpdate: AccountUpdate) => Promise<void>) => async accountUpdate => {
  await fetchJSON('update_account', accountUpdate);
};

const searchUsersActionTypes = Object.freeze({
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
const searchUsers = (
  fetchJSON: FetchJSON,
): ((
  usernamePrefix: string,
) => Promise<UserSearchResult>) => async usernamePrefix => {
  const response = await fetchJSON('search_users', { prefix: usernamePrefix });
  return {
    userInfos: response.userInfos,
  };
};

const updateSubscriptionActionTypes = Object.freeze({
  started: 'UPDATE_SUBSCRIPTION_STARTED',
  success: 'UPDATE_SUBSCRIPTION_SUCCESS',
  failed: 'UPDATE_SUBSCRIPTION_FAILED',
});
const updateSubscription = (
  fetchJSON: FetchJSON,
): ((
  subscriptionUpdate: SubscriptionUpdateRequest,
) => Promise<SubscriptionUpdateResult>) => async subscriptionUpdate => {
  const response = await fetchJSON(
    'update_user_subscription',
    subscriptionUpdate,
  );
  return {
    threadID: subscriptionUpdate.threadID,
    subscription: response.threadSubscription,
  };
};

const requestAccessActionTypes = Object.freeze({
  started: 'REQUEST_ACCESS_STARTED',
  success: 'REQUEST_ACCESS_SUCCESS',
  failed: 'REQUEST_ACCESS_FAILED',
});
const requestAccess = (
  fetchJSON: FetchJSON,
): ((accessRequest: AccessRequest) => Promise<void>) => async accessRequest => {
  await fetchJSON('request_access', accessRequest);
};

const setUserSettingsActionTypes = Object.freeze({
  started: 'SET_USER_SETTINGS_STARTED',
  success: 'SET_USER_SETTINGS_SUCCESS',
  failed: 'SET_USER_SETTINGS_FAILED',
});

const setUserSettings = (
  fetchJSON: FetchJSON,
): ((
  userSettingsRequest: UpdateUserSettingsRequest,
) => Promise<void>) => async userSettingsRequest => {
  await fetchJSON('update_user_settings', userSettingsRequest);
};

const getUserPublicKeys = (
  fetchJSON: FetchJSON,
): ((
  data: GetUserPublicKeysArgs,
) => Promise<UserPublicKeys | null>) => async data => {
  return await fetchJSON('get_user_public_keys', data);
};

export {
  appStartNativeCredentialsAutoLogIn,
  appStartReduxLoggedInButInvalidCookie,
  changeUserSettings,
  changeUserSettingsActionTypes,
  cookieInvalidationResolutionAttempt,
  deleteAccount,
  deleteAccountActionTypes,
  getUserPublicKeys,
  logIn,
  logInActionTypes,
  logOut,
  logOutActionTypes,
  register,
  registerActionTypes,
  requestAccess,
  requestAccessActionTypes,
  searchUsers,
  searchUsersActionTypes,
  setUserSettings,
  setUserSettingsActionTypes,
  socketAuthErrorResolutionAttempt,
  sqliteLoadFailure,
  sqliteOpFailure,
  updateSubscription,
  updateSubscriptionActionTypes,
};
