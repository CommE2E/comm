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
};
