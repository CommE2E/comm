// @flow

import bots from '../facts/bots';
import staff from '../facts/staff';
import type {
  ServerThreadInfo,
  RawThreadInfo,
  RelativeMemberInfo,
  ThreadInfo,
} from '../types/thread-types';
import type {
  RelativeUserInfo,
  UserInfo,
  UserInfos,
} from '../types/user-types';
import { memberHasAdminPowers } from './thread-utils';

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

function getKeyserverAdmin(
  community: ThreadInfo | RawThreadInfo | ServerThreadInfo,
  userInfos: UserInfos,
): ?UserInfo {
  // This hack only works as long as there is only one admin
  // Linear task to revert this:
  // https://linear.app/comm/issue/ENG-1707/revert-fix-getting-the-keyserver-admin-info
  const admin = community.members.find(memberHasAdminPowers);
  return admin ? userInfos[admin.id] : undefined;
}

export { stringForUser, isStaff, getKeyserverAdmin };
