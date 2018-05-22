// @flow

import type { RelativeUserInfo } from '../types/user-types';
import type { RelativeMemberInfo } from '../types/thread-types';

import ashoat from '../facts/ashoat';
import friends from '../facts/friends';

function stringForUser(user: RelativeUserInfo | RelativeMemberInfo): string {
  if (user.isViewer) {
    return "you";
  } else if (user.username) {
    return user.username;
  } else {
    return "anonymous";
  }
}

function isStaff(userID: string) {
  return userID === ashoat.id;
}

function hasWebChat(userID: string) {
  return isStaff(userID) || userID === friends.larry;
}

export {
  stringForUser,
  isStaff,
  hasWebChat,
};
