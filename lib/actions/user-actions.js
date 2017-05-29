// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { CalendarInfo } from '../types/calendar-types';
import type { VerifyField } from '../utils/verify-utils';
import type { UserInfo } from '../types/user-types';
import type { EntryInfo } from '../types/entry-types';
import type { CalendarResult } from './entry-actions';
import type { CalendarQuery } from '../selectors/nav-selectors';

import { verifyField } from '../utils/verify-utils';

const logOutActionType = "LOG_OUT";
async function logOut(
  fetchJSON: FetchJSON,
): Promise<{[id: string]: CalendarInfo}> {
  const response = await fetchJSON('logout.php', {});
  return response.cookie_change.thread_infos;
}

const deleteAccountActionType = "DELETE_ACCOUNT";
async function deleteAccount(
  fetchJSON: FetchJSON,
  password: string,
): Promise<{[id: string]: CalendarInfo}> {
  const response = await fetchJSON('delete_account.php', {
    'password': password,
  });
  return response.cookie_change.thread_infos;
}

const registerActionType = "REGISTER";
async function register(
  fetchJSON: FetchJSON,
  username: string,
  email: string,
  password: string,
): Promise<UserInfo> {
  await fetchJSON('register.php', { username, email, password });
  return { username, email, emailVerified: false };
}

export type LogInResult = {
  calendarInfos: {[id: string]: CalendarInfo},
  userInfo: UserInfo,
  calendarResult?: CalendarResult,
};
const logInActionType = "LOG_IN";
async function logIn(
  fetchJSON: FetchJSON,
  username: string,
  password: string,
): Promise<LogInResult> {
  const response = await fetchJSON('login.php', { username, password });
  return {
    calendarInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
  };
}

async function logInAndFetchEntries(
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
  });
  return {
    calendarInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      entryInfos: response.entries,
    },
  };
}

const resetPasswordActionType = "RESET_PASSWORD";
async function resetPassword(
  fetchJSON: FetchJSON,
  code: string,
  password: string,
): Promise<LogInResult> {
  const response = await fetchJSON('reset_password.php', { code, password });
  return {
    calendarInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
  };
}

async function resetPasswordAndFetchEntries(
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
  });
  return {
    calendarInfos: response.cookie_change.thread_infos,
    userInfo: {
      email: response.user_info.email,
      username: response.user_info.username,
      emailVerified: response.user_info.email_verified,
    },
    calendarResult: {
      calendarQuery,
      entryInfos: response.entries,
    },
  };
}

const forgotPasswordActionType = "FORGOT_PASSWORD";
async function forgotPassword(
  fetchJSON: FetchJSON,
  usernameOrEmail: string,
): Promise<void> {
  await fetchJSON('forgot_password.php', { 'username': usernameOrEmail });
}

export type ChangeUserSettingsResult = {
  email: string,
};
const changeUserSettingsActionType = "CHANGE_USER_SETTINGS";
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

const resendVerificationEmailActionType = "RESEND_VERIFICATION_EMAIL";
async function resendVerificationEmail(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('resend_verification.php', {});
}

const handleVerificationCodeActionType = "HANDLE_VERIFICATION_CODE";
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
  logOutActionType,
  logOut,
  deleteAccountActionType,
  deleteAccount,
  registerActionType,
  register,
  logInActionType,
  logIn,
  logInAndFetchEntries,
  resetPasswordActionType,
  resetPassword,
  resetPasswordAndFetchEntries,
  forgotPasswordActionType,
  forgotPassword,
  changeUserSettingsActionType,
  changeUserSettings,
  resendVerificationEmailActionType,
  resendVerificationEmail,
  handleVerificationCodeActionType,
  handleVerificationCode,
};
