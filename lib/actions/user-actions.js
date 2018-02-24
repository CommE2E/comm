// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { RawThreadInfo } from '../types/thread-types';
import {
  type VerifyField,
  verifyField,
  type HandleVerificationCodeResult,
} from '../types/verify-types';
import type {
  UserInfo,
  LoggedInUserInfo,
  LoggedOutUserInfo,
  AccountUpdate,
} from '../types/user-types';
import type { CalendarQuery, CalendarResult } from '../types/entry-types';
import type {
  SubscriptionUpdateRequest,
  ThreadSubscription,
} from '../types/subscription-types';
import {
  type GenericMessagesResult,
  defaultNumberPerThread,
} from '../types/message-types';
import type { UserSearchResult } from '../types/search-types';

import threadWatcher from '../shared/thread-watcher';

export type LogOutResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: UserInfo[],
  currentUserInfo: LoggedOutUserInfo,
|};

const logOutActionTypes = Object.freeze({
  started: "LOG_OUT_STARTED",
  success: "LOG_OUT_SUCCESS",
  failed: "LOG_OUT_FAILED",
});
async function logOut(
  fetchJSON: FetchJSON,
): Promise<LogOutResult> {
  const response = await fetchJSON('logout.php', {});
  return {
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
    currentUserInfo: response.current_user_info,
  };
}

const deleteAccountActionTypes = Object.freeze({
  started: "DELETE_ACCOUNT_STARTED",
  success: "DELETE_ACCOUNT_SUCCESS",
  failed: "DELETE_ACCOUNT_FAILED",
});
async function deleteAccount(
  fetchJSON: FetchJSON,
  password: string,
): Promise<LogOutResult> {
  const response = await fetchJSON('delete_account.php', {
    'password': password,
  });
  return {
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
    currentUserInfo: response.current_user_info,
  };
}

const registerActionTypes = Object.freeze({
  started: "REGISTER_STARTED",
  success: "REGISTER_SUCCESS",
  failed: "REGISTER_FAILED",
});
async function register(
  fetchJSON: FetchJSON,
  username: string,
  email: string,
  password: string,
): Promise<LoggedInUserInfo> {
  const result = await fetchJSON('register.php', { username, email, password });
  return { id: result.id, username, email, emailVerified: false };
}

function mergeUserInfos(...userInfoArrays: UserInfo[][]): UserInfo[] {
  const merged = {};
  for (let userInfoArray of userInfoArrays) {
    for (let userInfo of userInfoArray) {
      merged[userInfo.id] = userInfo;
    }
  }
  const flattened = [];
  for (let id in merged) {
    flattened.push(merged[id]);
  }
  return flattened;
}

const cookieInvalidationResolutionAttempt =
  "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT";
const appStartNativeCredentialsAutoLogIn =
  "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN";
const appStartReduxLoggedInButInvalidCookie =
  "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE";
export type LogInActionSource =
  | "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT"
  | "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN"
  | "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE";
export type LogInStartingPayload = {|
  source?: LogInActionSource,
  calendarQuery?: CalendarQuery,
|};
export type LogInResult = {|
  threadInfos: {[id: string]: RawThreadInfo},
  currentUserInfo: LoggedInUserInfo,
  calendarResult?: CalendarResult,
  messagesResult: GenericMessagesResult,
  userInfos: UserInfo[],
|};

const logInActionTypes = Object.freeze({
  started: "LOG_IN_STARTED",
  success: "LOG_IN_SUCCESS",
  failed: "LOG_IN_FAILED",
});
async function logIn(
  fetchJSON: FetchJSON,
  username: string,
  password: string,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('login.php', {
    username,
    password,
    'fetch_messages_per_thread': defaultNumberPerThread,
    'watched_ids': watchedIDs,
  });
  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: {
      id: response.current_user_info.id,
      email: response.current_user_info.email,
      username: response.current_user_info.username,
      emailVerified: response.current_user_info.email_verified,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
      watchedIDsAtRequestTime: watchedIDs,
    },
    userInfos: mergeUserInfos(
      response.user_infos,
      response.cookieChange.userInfos,
    ),
  };
}

async function logInAndFetchInitialData(
  fetchJSON: FetchJSON,
  username: string,
  password: string,
  calendarQuery: CalendarQuery,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('login.php', {
    username,
    password,
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
    'fetch_messages_per_thread': defaultNumberPerThread,
    'watched_ids': watchedIDs,
  });
  const userInfos = mergeUserInfos(
    response.user_infos,
    response.cookieChange.userInfos,
  );
  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: {
      id: response.current_user_info.id,
      email: response.current_user_info.email,
      username: response.current_user_info.username,
      emailVerified: response.current_user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      rawEntryInfos: response.entry_infos,
      userInfos,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
      watchedIDsAtRequestTime: watchedIDs,
    },
    userInfos,
  };
}

const resetPasswordActionTypes = Object.freeze({
  started: "RESET_PASSWORD_STARTED",
  success: "RESET_PASSWORD_SUCCESS",
  failed: "RESET_PASSWORD_FAILED",
});
async function resetPassword(
  fetchJSON: FetchJSON,
  code: string,
  password: string,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('reset_password.php', {
    code,
    password,
    'fetch_messages_per_thread': defaultNumberPerThread,
    'watched_ids': watchedIDs,
  });
  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: {
      id: response.current_user_info.id,
      email: response.current_user_info.email,
      username: response.current_user_info.username,
      emailVerified: response.current_user_info.email_verified,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
      watchedIDsAtRequestTime: watchedIDs,
    },
    userInfos: mergeUserInfos(
      response.user_infos,
      response.cookieChange.userIinfos,
    ),
  };
}

async function resetPasswordAndFetchInitialData(
  fetchJSON: FetchJSON,
  code: string,
  password: string,
  calendarQuery: CalendarQuery,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('reset_password.php', {
    code,
    password,
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
    'fetch_messages_per_thread': defaultNumberPerThread,
    'watched_ids': watchedIDs,
  });
  const userInfos = mergeUserInfos(
    response.user_infos,
    response.cookieChange.userInfos,
  );
  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: {
      id: response.current_user_info.id,
      email: response.current_user_info.email,
      username: response.current_user_info.username,
      emailVerified: response.current_user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      rawEntryInfos: response.entry_infos,
      userInfos,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
      watchedIDsAtRequestTime: watchedIDs,
    },
    userInfos,
  };
}

const forgotPasswordActionTypes = Object.freeze({
  started: "FORGOT_PASSWORD_STARTED",
  success: "FORGOT_PASSWORD_SUCCESS",
  failed: "FORGOT_PASSWORD_FAILED",
});
async function forgotPassword(
  fetchJSON: FetchJSON,
  usernameOrEmail: string,
): Promise<void> {
  await fetchJSON('forgot_password.php', {
    input: { usernameOrEmail },
  });
}

export type ChangeUserSettingsResult = {|
  email: ?string,
|};
const changeUserSettingsActionTypes = Object.freeze({
  started: "CHANGE_USER_SETTINGS_STARTED",
  success: "CHANGE_USER_SETTINGS_SUCCESS",
  failed: "CHANGE_USER_SETTINGS_FAILED",
});
async function changeUserSettings(
  fetchJSON: FetchJSON,
  accountUpdate: AccountUpdate,
): Promise<ChangeUserSettingsResult> {
  const response = await fetchJSON('edit_account.php', {
    input: accountUpdate,
  });
  return { email: accountUpdate.updatedFields.email };
}

const resendVerificationEmailActionTypes = Object.freeze({
  started: "RESEND_VERIFICATION_EMAIL_STARTED",
  success: "RESEND_VERIFICATION_EMAIL_SUCCESS",
  failed: "RESEND_VERIFICATION_EMAIL_FAILED",
});
async function resendVerificationEmail(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('resend_verification.php', {});
}

const handleVerificationCodeActionTypes = Object.freeze({
  started: "HANDLE_VERIFICATION_CODE_STARTED",
  success: "HANDLE_VERIFICATION_CODE_SUCCESS",
  failed: "HANDLE_VERIFICATION_CODE_FAILED",
});
async function handleVerificationCode(
  fetchJSON: FetchJSON,
  code: string,
): Promise<HandleVerificationCodeResult> {
  const result = await fetchJSON('verify.php', { input: { code } });
  const { verifyField, resetPasswordUsername } = result;
  return { verifyField, resetPasswordUsername };
}

const searchUsersActionTypes = Object.freeze({
  started: "SEARCH_USERS_STARTED",
  success: "SEARCH_USERS_SUCCESS",
  failed: "SEARCH_USERS_FAILED",
});
async function searchUsers(
  fetchJSON: FetchJSON,
  usernamePrefix: string,
): Promise<UserSearchResult> {
  const response = await fetchJSON(
    'search_users.php',
    { input: { prefix: usernamePrefix } },
  );
  return {
    userInfos: response.userInfos,
  };
}

const updateSubscriptionActionTypes = Object.freeze({
  started: "UPDATE_SUBSCRIPTION_STARTED",
  success: "UPDATE_SUBSCRIPTION_SUCCESS",
  failed: "UPDATE_SUBSCRIPTION_FAILED",
});
async function updateSubscription(
  fetchJSON: FetchJSON,
  subscriptionUpdate: SubscriptionUpdateRequest,
): Promise<ThreadSubscription> {
  const response = await fetchJSON('update_subscription.php', {
    input: subscriptionUpdate,
  });
  return response.threadSubscription;
}

export {
  logOutActionTypes,
  logOut,
  deleteAccountActionTypes,
  deleteAccount,
  registerActionTypes,
  register,
  cookieInvalidationResolutionAttempt,
  appStartNativeCredentialsAutoLogIn,
  appStartReduxLoggedInButInvalidCookie,
  logInActionTypes,
  logIn,
  logInAndFetchInitialData,
  resetPasswordActionTypes,
  resetPassword,
  resetPasswordAndFetchInitialData,
  forgotPasswordActionTypes,
  forgotPassword,
  changeUserSettingsActionTypes,
  changeUserSettings,
  resendVerificationEmailActionTypes,
  resendVerificationEmail,
  handleVerificationCodeActionTypes,
  handleVerificationCode,
  searchUsersActionTypes,
  searchUsers,
  updateSubscriptionActionTypes,
  updateSubscription,
};
