// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { ThreadInfo } from '../types/thread-types';
import type { VerifyField } from '../utils/verify-utils';
import type { UserInfo } from '../types/user-types';
import type { EntryInfo } from '../types/entry-types';
import type { CalendarResult } from './entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';
import type { GenericMessagesResult } from './message-actions';

import { verifyField } from '../utils/verify-utils';
import { numberPerThread } from '../reducers/message-reducer';

const logOutActionTypes = {
  started: "LOG_OUT_STARTED",
  success: "LOG_OUT_SUCCESS",
  failed: "LOG_OUT_FAILED",
};
async function logOut(
  fetchJSON: FetchJSON,
): Promise<{[id: string]: ThreadInfo}> {
  const response = await fetchJSON('logout.php', {});
  return response.cookie_change.thread_infos;
}

const deleteAccountActionTypes = {
  started: "DELETE_ACCOUNT_STARTED",
  success: "DELETE_ACCOUNT_SUCCESS",
  failed: "DELETE_ACCOUNT_FAILED",
};
async function deleteAccount(
  fetchJSON: FetchJSON,
  password: string,
): Promise<{[id: string]: ThreadInfo}> {
  const response = await fetchJSON('delete_account.php', {
    'password': password,
  });
  return response.cookie_change.thread_infos;
}

const registerActionTypes = {
  started: "REGISTER_STARTED",
  success: "REGISTER_SUCCESS",
  failed: "REGISTER_FAILED",
};
async function register(
  fetchJSON: FetchJSON,
  username: string,
  email: string,
  password: string,
): Promise<UserInfo> {
  await fetchJSON('register.php', { username, email, password });
  return { username, email, emailVerified: false };
}

export type LogInStartingPayload = {
  source?: "COOKIE_INVALIDATION_RESOLUTION_ATTEMPT" |
    "APP_START_NATIVE_CREDENTIALS_AUTO_LOG_IN" |
    "APP_START_REDUX_LOGGED_IN_BUT_INVALID_COOKIE",
  calendarQuery?: CalendarQuery,
};
export type LogInResult = {
  threadInfos: {[id: string]: ThreadInfo},
  userInfo: UserInfo,
  calendarResult?: CalendarResult,
  messagesResult: GenericMessagesResult,
};

const logInActionTypes = {
  started: "LOG_IN_STARTED",
  success: "LOG_IN_SUCCESS",
  failed: "LOG_IN_FAILED",
};
async function logIn(
  fetchJSON: FetchJSON,
  username: string,
  password: string,
): Promise<LogInResult> {
  const response = await fetchJSON('login.php', {
    username,
    password,
    'fetch_messages_per_thread': numberPerThread,
  });
  return {
    threadInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
  };
}

async function logInAndFetchInitialData(
  fetchJSON: FetchJSON,
  username: string,
  password: string,
  calendarQuery: CalendarQuery,
): Promise<LogInResult> {
  const response = await fetchJSON('login.php', {
    username,
    password,
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
    'fetch_messages_per_thread': numberPerThread,
  });
  return {
    threadInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      entryInfos: response.entries,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
  };
}

const resetPasswordActionTypes = {
  started: "RESET_PASSWORD_STARTED",
  success: "RESET_PASSWORD_SUCCESS",
  failed: "RESET_PASSWORD_FAILED",
};
async function resetPassword(
  fetchJSON: FetchJSON,
  code: string,
  password: string,
): Promise<LogInResult> {
  const response = await fetchJSON('reset_password.php', {
    code,
    password,
    'fetch_messages_per_thread': numberPerThread,
  });
  return {
    threadInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
  };
}

async function resetPasswordAndFetchInitialData(
  fetchJSON: FetchJSON,
  code: string,
  password: string,
  calendarQuery: CalendarQuery,
): Promise<LogInResult> {
  const response = await fetchJSON('reset_password.php', {
    code,
    password,
    'inner_entry_query': {
      'nav': calendarQuery.navID,
      'start_date': calendarQuery.startDate,
      'end_date': calendarQuery.endDate,
      'include_deleted': !!calendarQuery.includeDeleted,
    },
    'fetch_messages_per_thread': numberPerThread,
  });
  return {
    threadInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      entryInfos: response.entries,
    },
    messagesResult: {
      messageInfos: response.message_infos,
      truncationStatus: response.truncation_status,
      serverTime: response.server_time,
    },
  };
}

const forgotPasswordActionTypes = {
  started: "FORGOT_PASSWORD_STARTED",
  success: "FORGOT_PASSWORD_SUCCESS",
  failed: "FORGOT_PASSWORD_FAILED",
};
async function forgotPassword(
  fetchJSON: FetchJSON,
  usernameOrEmail: string,
): Promise<void> {
  await fetchJSON('forgot_password.php', { 'username': usernameOrEmail });
}

export type ChangeUserSettingsResult = {
  email: string,
};
const changeUserSettingsActionTypes = {
  started: "CHANGE_USER_SETTINGS_STARTED",
  success: "CHANGE_USER_SETTINGS_SUCCESS",
  failed: "CHANGE_USER_SETTINGS_FAILED",
};
async function changeUserSettings(
  fetchJSON: FetchJSON,
  currentPassword: string,
  newEmail: string,
  newPassword: string,
): Promise<ChangeUserSettingsResult> {
  const response = await fetchJSON('edit_account.php', {
    'old_password': currentPassword,
    'email': newEmail,
    'new_password': newPassword,
  });
  return { email: newEmail };
}

const resendVerificationEmailActionTypes = {
  started: "RESEND_VERIFICATION_EMAIL_STARTED",
  success: "RESEND_VERIFICATION_EMAIL_SUCCESS",
  failed: "RESEND_VERIFICATION_EMAIL_FAILED",
};
async function resendVerificationEmail(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('resend_verification.php', {});
}

const handleVerificationCodeActionTypes = {
  started: "HANDLE_VERIFICATION_CODE_STARTED",
  success: "HANDLE_VERIFICATION_CODE_SUCCESS",
  failed: "HANDLE_VERIFICATION_CODE_FAILED",
};
export type HandleVerificationCodeResult = {
  verifyField: VerifyField,
  resetPasswordUsername?: string,
};
async function handleVerificationCode(
  fetchJSON: FetchJSON,
  code: string,
): Promise<HandleVerificationCodeResult> {
  const response = await fetchJSON('verify.php', { code });
  const ourVerifyField = response['verify_field'];
  if (ourVerifyField === verifyField.EMAIL) {
    return { verifyField: ourVerifyField };
  } else if (ourVerifyField === verifyField.RESET_PASSWORD) {
    return {
      verifyField: ourVerifyField,
      resetPasswordUsername: response.username,
    };
  } else {
    throw new Error(`unhandled verification field ${ourVerifyField}`);
  }
}

export {
  logOutActionTypes,
  logOut,
  deleteAccountActionTypes,
  deleteAccount,
  registerActionTypes,
  register,
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
};
