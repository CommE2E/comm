// @flow

import ashoat from '../facts/ashoat';
import bots from '../facts/bots';
import type { RelativeMemberInfo } from '../types/thread-types';
import type { RelativeUserInfo } from '../types/user-types';

function stringForUser(user: RelativeUserInfo | RelativeMemberInfo): string {
  if (user.isViewer) {
    return 'you';
  } else if (user.username) {
    return user.username;
  } else {
    return 'anonymous';
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

export { stringForUser, isStaff };
