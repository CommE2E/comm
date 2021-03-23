// @flow

import bots from '../facts/bots';
import staff from '../facts/staff';
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

function isStaff(userID: string): boolean {
  if (staff.includes(userID)) {
    return true;
  }
  for (const key in bots) {
    const bot = bots[key];
    if (userID === bot.userID) {
      return true;
    }
  }
  return false;
}

export { stringForUser, isStaff };
