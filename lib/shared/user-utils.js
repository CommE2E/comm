// @flow

import { memberHasAdminPowers } from './thread-utils.js';
import bots from '../facts/bots.js';
import staff from '../facts/staff.js';
import { useENSNames } from '../hooks/ens-cache.js';
import type {
  ServerThreadInfo,
  RawThreadInfo,
  ThreadInfo,
} from '../types/thread-types.js';
import type { UserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

function stringForUser(user: {
  +username?: ?string,
  +isViewer?: ?boolean,
  ...
}): string {
  if (user.isViewer) {
    return 'you';
  }

  return stringForUserExplicit(user);
}

function stringForUserExplicit(user: { +username: ?string, ... }): string {
  if (user.username) {
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

function useKeyserverAdmin(
  community: ThreadInfo | RawThreadInfo | ServerThreadInfo,
): ?UserInfo {
  const userInfos = useSelector(state => state.userStore.userInfos);
  // This hack only works as long as there is only one admin
  // Linear task to revert this:
  // https://linear.app/comm/issue/ENG-1707/revert-fix-getting-the-keyserver-admin-info
  const admin = community.members.find(memberHasAdminPowers);
  const adminUserInfo = admin ? userInfos[admin.id] : undefined;
  const [adminUserInfoWithENSName] = useENSNames([adminUserInfo]);
  return adminUserInfoWithENSName;
}

export { stringForUser, stringForUserExplicit, isStaff, useKeyserverAdmin };
