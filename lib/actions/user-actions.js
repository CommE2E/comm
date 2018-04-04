// @flow

import type { FetchJSON } from '../utils/fetch-json';
import {
  verifyField,
  type HandleVerificationCodeResult,
} from '../types/verify-types';
import type { UserInfo, AccountUpdate } from '../types/user-types';
import type {
  ChangeUserSettingsResult,
  LogOutResult,
  LogInInfo,
  LogInResult,
  RegisterResult,
  UpdatePasswordInfo,
} from '../types/account-types';
import type {
  SubscriptionUpdateRequest,
  ThreadSubscription,
} from '../types/subscription-types';
import type { UserSearchResult } from '../types/search-types';

import threadWatcher from '../shared/thread-watcher';

const logOutActionTypes = Object.freeze({
  started: "LOG_OUT_STARTED",
  success: "LOG_OUT_SUCCESS",
  failed: "LOG_OUT_FAILED",
});
async function logOut(
  fetchJSON: FetchJSON,
): Promise<LogOutResult> {
  const response = await fetchJSON('log_out', {});
  return {
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
    currentUserInfo: response.currentUserInfo,
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
  const response = await fetchJSON('delete_account', { password });
  return {
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
    currentUserInfo: response.currentUserInfo,
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
): Promise<RegisterResult> {
  const response = await fetchJSON('create_account', {
    username,
    email,
    password,
  });
  return {
    currentUserInfo: {
      id: response.id,
      username,
      email,
      emailVerified: false,
    },
    rawMessageInfos: response.rawMessageInfos,
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
  };
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

const logInActionTypes = Object.freeze({
  started: "LOG_IN_STARTED",
  success: "LOG_IN_SUCCESS",
  failed: "LOG_IN_FAILED",
});
async function logIn(
  fetchJSON: FetchJSON,
  logInInfo: LogInInfo,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const request = { ...logInInfo, watchedIDs };
  const response = await fetchJSON('log_in', request);

  const userInfos = mergeUserInfos(
    response.userInfos,
    response.cookieChange.userInfos,
  );
  let calendarResult = null;
  if (logInInfo.calendarQuery) {
    calendarResult = {
      calendarQuery: logInInfo.calendarQuery,
      rawEntryInfos: response.rawEntryInfos,
      userInfos,
    };
  }

  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: response.currentUserInfo,
    calendarResult,
    messagesResult: {
      messageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses,
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: response.serverTime,
    },
    userInfos,
    updatesResult: {
      currentAsOf: response.serverTime,
      newUpdates: response.newUpdates,
    },
  };
}

const resetPasswordActionTypes = Object.freeze({
  started: "RESET_PASSWORD_STARTED",
  success: "RESET_PASSWORD_SUCCESS",
  failed: "RESET_PASSWORD_FAILED",
});
async function resetPassword(
  fetchJSON: FetchJSON,
  updatePasswordInfo: UpdatePasswordInfo,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const request = { ...updatePasswordInfo, watchedIDs };
  const response = await fetchJSON('update_password', request);

  const userInfos = mergeUserInfos(
    response.user_infos,
    response.cookieChange.userInfos,
  );
  let calendarResult = null;
  if (updatePasswordInfo.calendarQuery) {
    calendarResult = {
      calendarQuery: updatePasswordInfo.calendarQuery,
      rawEntryInfos: response.rawEntryInfos,
      userInfos,
    };
  }

  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: response.currentUserInfo,
    calendarResult,
    messagesResult: {
      messageInfos: response.rawMessageInfos,
      truncationStatus: response.truncationStatuses,
      watchedIDsAtRequestTime: watchedIDs,
      currentAsOf: response.serverTime,
    },
    userInfos,
    updatesResult: {
      currentAsOf: response.serverTime,
      newUpdates: response.newUpdates,
    },
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
  await fetchJSON('send_password_reset_email', { usernameOrEmail });
}

const changeUserSettingsActionTypes = Object.freeze({
  started: "CHANGE_USER_SETTINGS_STARTED",
  success: "CHANGE_USER_SETTINGS_SUCCESS",
  failed: "CHANGE_USER_SETTINGS_FAILED",
});
async function changeUserSettings(
  fetchJSON: FetchJSON,
  accountUpdate: AccountUpdate,
): Promise<ChangeUserSettingsResult> {
  await fetchJSON('update_account', accountUpdate);
  return { email: accountUpdate.updatedFields.email };
}

const resendVerificationEmailActionTypes = Object.freeze({
  started: "RESEND_VERIFICATION_EMAIL_STARTED",
  success: "RESEND_VERIFICATION_EMAIL_SUCCESS",
  failed: "RESEND_VERIFICATION_EMAIL_FAILED",
});
async function resendVerificationEmail(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('send_verification_email', {});
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
  const result = await fetchJSON('verify_code', { code });
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
    'search_users',
    { prefix: usernamePrefix },
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
  const response = await fetchJSON(
    'update_user_subscription',
    subscriptionUpdate,
  );
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
  resetPasswordActionTypes,
  resetPassword,
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
