// @flow

import type { RelativeUserInfo } from '../types/user-types';
import type { RelativeMemberInfo } from '../types/thread-types';

import ashoat from '../facts/ashoat';
import friends from '../facts/friends';
import bots from '../facts/bots';

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
  if (userID === ashoat.id) {
    return true;
  }
  for (let key in bots) {
    const bot = bots[key];
    if (userID === bot.userID) {
      return true;
    }
  }
  return false;
}

export {
  stringForUser,
  isStaff,
};
