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

export {
  logOut,
  logOutActionType,
  deleteAccount,
  deleteAccountActionType,
};
