// @flow

import type { CurrentUserInfo } from '../types/user-types.js';
import { isValidEthereumAddress } from '../utils/siwe-utils.js';

const usernameMaxLength = 191;
const usernameMinLength = 1;
const secondCharRange = `{${usernameMinLength - 1},${usernameMaxLength - 1}}`;
const validUsernameRegexString = `^[a-zA-Z0-9][a-zA-Z0-9-_]${secondCharRange}$`;
const validUsernameRegex: RegExp = new RegExp(validUsernameRegexString);

// usernames used to be less restrictive (eg single chars were allowed)
// use oldValidUsername when dealing with existing accounts
const oldValidUsernameRegexString = '[a-zA-Z0-9-_]+';
const oldValidUsernameRegex: RegExp = new RegExp(
  `^${oldValidUsernameRegexString}$`,
);

const validEmailRegex: RegExp = new RegExp(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source,
);

const validHexColorRegex: RegExp = /^[a-fA-F0-9]{6}$/;

function accountHasPassword(currentUserInfo: ?CurrentUserInfo): boolean {
  return currentUserInfo?.username
    ? !isValidEthereumAddress(currentUserInfo.username)
    : false;
}

function userIdentifiedByETHAddress(
  userInfo: ?{ +username?: ?string, ... },
): boolean {
  return userInfo?.username
    ? isValidEthereumAddress(userInfo?.username)
    : false;
}

function getETHAddressForUserInfo(
  userInfo: ?{ +username?: ?string, ... },
): ?string {
  if (!userInfo) {
    return null;
  }
  const { username } = userInfo;
  const ethAddress =
    username && userIdentifiedByETHAddress(userInfo) ? username : null;

  return ethAddress;
}

export {
  usernameMaxLength,
  oldValidUsernameRegexString,
  validUsernameRegex,
  oldValidUsernameRegex,
  validEmailRegex,
  validHexColorRegex,
  accountHasPassword,
  userIdentifiedByETHAddress,
  getETHAddressForUserInfo,
};
