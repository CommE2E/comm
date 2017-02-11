// @flow

import type { BaseAppState } from '../types/redux-types';

import fetchJSON from '../utils/fetch-json';

const logOutActionType = "LOG_OUT";
async function logOut() {
  const response = await fetchJSON('logout.php', {});
  return response.calendar_infos;
}

const deleteAccountActionType = "DELETE_ACCOUNT";
async function deleteAccount(password: string) {
  const response = await fetchJSON('delete_account.php', {
    'password': password,
  });
  return response.calendar_infos;
}

const logInActionType = "LOG_IN";
async function logIn(username: string, password: string) {
  const response = await fetchJSON('login.php', { username, password });
  return {
    calendarInfos: response.calendar_infos,
    userInfo: {
      email: response.email,
      username: response.username,
      emailVerified: response.email_verified,
    },
  };
}

const registerActionType = "REGISTER";
async function register(username: string, email: string, password: string) {
  await fetchJSON('register.php', { username, email, password });
  return { username, email, emailVerified: false };
}

const resetPasswordActionType = "RESET_PASSWORD";
async function resetPassword(code: string, password: string) {
  const response = await fetchJSON('reset_password.php', { code, password });
  return {
    calendarInfos: response.calendar_infos,
    userInfo: {
      email: response.email,
      username: response.username,
      emailVerified: response.email_verified,
    },
  };
}

const forgotPasswordActionType = "FORGOT_PASSWORD";
async function forgotPassword(usernameOrEmail: string) {
  await fetchJSON('forgot_password.php', { 'username': usernameOrEmail });
}

const changeUserSettingsActionType = "CHANGE_USER_SETTINGS";
async function changeUserSettings(
  currentPassword: string,
  newEmail: string,
  newPassword: string,
) {
  const response = await fetchJSON('edit_account.php', {
    'old_password': currentPassword,
    'email': newEmail,
    'new_password': newPassword,
  });
  return { email: newEmail };
}

const resendVerificationEmailActionType = "RESEND_VERIFICATION_EMAIL";
async function resendVerificationEmail() {
  await fetchJSON('resend_verification.php', {});
}

export {
  logOutActionType,
  logOut,
  deleteAccountActionType,
  deleteAccount,
  logInActionType,
  logIn,
  registerActionType,
  register,
  resetPasswordActionType,
  resetPassword,
  forgotPasswordActionType,
  forgotPassword,
  changeUserSettingsActionType,
  changeUserSettings,
  resendVerificationEmailActionType,
  resendVerificationEmail,
};
