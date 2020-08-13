// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { HandleVerificationCodeResult } from '../types/verify-types';
import type { UserInfo, AccountUpdate } from '../types/user-types';
import type {
  ChangeUserSettingsResult,
  LogOutResult,
  LogInInfo,
  LogInResult,
  RegisterResult,
  UpdatePasswordInfo,
  RegisterInfo,
  AccessRequest,
} from '../types/account-types';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../types/subscription-types';
import type { UserSearchResult } from '../types/search-types';
import type { PreRequestUserState } from '../types/session-types';

import threadWatcher from '../shared/thread-watcher';
import { getConfig } from '../utils/config';
import sleep from '../utils/sleep';

const logOutActionTypes = Object.freeze({
  started: 'LOG_OUT_STARTED',
  success: 'LOG_OUT_SUCCESS',
  failed: 'LOG_OUT_FAILED',
});
async function logOut(
  fetchJSON: FetchJSON,
  preRequestUserState: PreRequestUserState,
): Promise<LogOutResult> {
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
}

const deleteAccountActionTypes = Object.freeze({
  started: 'DELETE_ACCOUNT_STARTED',
  success: 'DELETE_ACCOUNT_SUCCESS',
  failed: 'DELETE_ACCOUNT_FAILED',
});
async function deleteAccount(
  fetchJSON: FetchJSON,
  password: string,
  preRequestUserState: PreRequestUserState,
): Promise<LogOutResult> {
  let response = null;
  try {
    response = await Promise.race([
      fetchJSON('delete_account', { password }),
      (async () => {
        await sleep(500);
        throw new Error('delete_account took more than 500ms');
      })(),
    ]);
  } catch {}
  const currentUserInfo = response ? response.currentUserInfo : null;
  return { currentUserInfo, preRequestUserState };
}

const registerActionTypes = Object.freeze({
  started: 'REGISTER_STARTED',
  success: 'REGISTER_SUCCESS',
  failed: 'REGISTER_FAILED',
});
async function register(
  fetchJSON: FetchJSON,
  registerInfo: RegisterInfo,
): Promise<RegisterResult> {
  const response = await fetchJSON('create_account', {
    ...registerInfo,
    platformDetails: getConfig().platformDetails,
  });
  return {
    currentUserInfo: {
      id: response.id,
      username: registerInfo.username,
      email: registerInfo.email,
      emailVerified: false,
    },
    rawMessageInfos: response.rawMessageInfos,
    threadInfos: response.cookieChange.threadInfos,
    userInfos: response.cookieChange.userInfos,
    calendarQuery: registerInfo.calendarQuery,
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
  'COOKIE_INVALIDATION_RESOLUTION_ATTEMPT';
const appStartNativeCredentialsAutoLogIn =
  'APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN';
const appStartReduxLoggedInButInvalidCookie =
  'APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE';
const socketAuthErrorResolutionAttempt = 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT';

const logInActionTypes = Object.freeze({
  started: 'LOG_IN_STARTED',
  success: 'LOG_IN_SUCCESS',
  failed: 'LOG_IN_FAILED',
});
async function logIn(
  fetchJSON: FetchJSON,
  logInInfo: LogInInfo,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('log_in', {
    ...logInInfo,
    watchedIDs,
    platformDetails: getConfig().platformDetails,
  });
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
  };
}

const resetPasswordActionTypes = Object.freeze({
  started: 'RESET_PASSWORD_STARTED',
  success: 'RESET_PASSWORD_SUCCESS',
  failed: 'RESET_PASSWORD_FAILED',
});
async function resetPassword(
  fetchJSON: FetchJSON,
  updatePasswordInfo: UpdatePasswordInfo,
): Promise<LogInResult> {
  const watchedIDs = threadWatcher.getWatchedIDs();
  const response = await fetchJSON('update_password', {
    ...updatePasswordInfo,
    watchedIDs,
    platformDetails: getConfig().platformDetails,
  });
  const userInfos = mergeUserInfos(
    response.userInfos,
    response.cookieChange.userInfos,
  );
  return {
    threadInfos: response.cookieChange.threadInfos,
    currentUserInfo: response.currentUserInfo,
    calendarResult: {
      calendarQuery: updatePasswordInfo.calendarQuery,
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
  };
}

const forgotPasswordActionTypes = Object.freeze({
  started: 'FORGOT_PASSWORD_STARTED',
  success: 'FORGOT_PASSWORD_SUCCESS',
  failed: 'FORGOT_PASSWORD_FAILED',
});
async function forgotPassword(
  fetchJSON: FetchJSON,
  usernameOrEmail: string,
): Promise<void> {
  await fetchJSON('send_password_reset_email', { usernameOrEmail });
}

const changeUserSettingsActionTypes = Object.freeze({
  started: 'CHANGE_USER_SETTINGS_STARTED',
  success: 'CHANGE_USER_SETTINGS_SUCCESS',
  failed: 'CHANGE_USER_SETTINGS_FAILED',
});
async function changeUserSettings(
  fetchJSON: FetchJSON,
  accountUpdate: AccountUpdate,
): Promise<ChangeUserSettingsResult> {
  await fetchJSON('update_account', accountUpdate);
  return { email: accountUpdate.updatedFields.email };
}

const resendVerificationEmailActionTypes = Object.freeze({
  started: 'RESEND_VERIFICATION_EMAIL_STARTED',
  success: 'RESEND_VERIFICATION_EMAIL_SUCCESS',
  failed: 'RESEND_VERIFICATION_EMAIL_FAILED',
});
async function resendVerificationEmail(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('send_verification_email', {});
}

const handleVerificationCodeActionTypes = Object.freeze({
  started: 'HANDLE_VERIFICATION_CODE_STARTED',
  success: 'HANDLE_VERIFICATION_CODE_SUCCESS',
  failed: 'HANDLE_VERIFICATION_CODE_FAILED',
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
  started: 'SEARCH_USERS_STARTED',
  success: 'SEARCH_USERS_SUCCESS',
  failed: 'SEARCH_USERS_FAILED',
});
async function searchUsers(
  fetchJSON: FetchJSON,
  usernamePrefix: string,
): Promise<UserSearchResult> {
  const response = await fetchJSON('search_users', { prefix: usernamePrefix });
  return {
    userInfos: response.userInfos,
  };
}

const updateSubscriptionActionTypes = Object.freeze({
  started: 'UPDATE_SUBSCRIPTION_STARTED',
  success: 'UPDATE_SUBSCRIPTION_SUCCESS',
  failed: 'UPDATE_SUBSCRIPTION_FAILED',
});
async function updateSubscription(
  fetchJSON: FetchJSON,
  subscriptionUpdate: SubscriptionUpdateRequest,
): Promise<SubscriptionUpdateResult> {
  const response = await fetchJSON(
    'update_user_subscription',
    subscriptionUpdate,
  );
  return {
    threadID: subscriptionUpdate.threadID,
    subscription: response.threadSubscription,
  };
}

const requestAccessActionTypes = Object.freeze({
  started: 'REQUEST_ACCESS_STARTED',
  success: 'REQUEST_ACCESS_SUCCESS',
  failed: 'REQUEST_ACCESS_FAILED',
});
async function requestAccess(
  fetchJSON: FetchJSON,
  accessRequest: AccessRequest,
): Promise<void> {
  await fetchJSON('request_access', accessRequest);
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
  socketAuthErrorResolutionAttempt,
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
  requestAccessActionTypes,
  requestAccess,
};
