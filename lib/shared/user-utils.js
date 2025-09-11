// @flow

import * as React from 'react';

import { roleIsAdminRole } from './thread-utils.js';
import { useResolvableNames } from '../hooks/names-cache.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { UserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

function ensNameForFarcasterUsername(farcasterUsername: string): string {
  if (farcasterUsername.endsWith('.eth')) {
    return farcasterUsername;
  }
  return `${farcasterUsername}.fcast.id`;
}

function stringForUser(
  user: ?{
    +username?: ?string,
    +farcasterUsername?: ?string,
    +isViewer?: ?boolean,
    ...
  },
): string {
  if (user?.isViewer) {
    return 'you';
  }

  return stringForUserExplicit(user);
}

function stringForUserExplicit(
  user: ?{ +username: ?string, +farcasterUsername?: ?string, ... },
  preferFarcaster?: boolean,
): string {
  const commUsername = user?.username && user.username !== 'anonymous';
  const farcasterUsername = user?.farcasterUsername;

  if ((preferFarcaster || !commUsername) && farcasterUsername) {
    return ensNameForFarcasterUsername(farcasterUsername);
  }

  if (user?.username) {
    return user.username;
  } else if (farcasterUsername) {
    return ensNameForFarcasterUsername(farcasterUsername);
  }

  return 'anonymous';
}

function useKeyserverAdmin(community: ThreadInfo | RawThreadInfo): ?UserInfo {
  const userInfos = useSelector(state => state.userStore.userInfos);
  // This hack only works as long as there is only one admin
  // Linear task to revert this:
  // https://linear.app/comm/issue/ENG-1707/revert-fix-getting-the-keyserver-admin-info
  const { roles, members } = community;
  const admin = members.find(member =>
    member.role ? roleIsAdminRole(roles[member.role]) : false,
  );
  const adminUserInfo = admin ? userInfos[admin.id] : undefined;
  const adminUserInfos = React.useMemo(() => [adminUserInfo], [adminUserInfo]);
  const [adminUserInfoWithENSName] = useResolvableNames(adminUserInfos);
  return adminUserInfoWithENSName;
}

export {
  ensNameForFarcasterUsername,
  stringForUser,
  stringForUserExplicit,
  useKeyserverAdmin,
};
