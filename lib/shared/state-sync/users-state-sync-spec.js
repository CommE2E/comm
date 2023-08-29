// @flow

import type { StateSyncSpec } from './state-sync-spec.js';
import type { UserInfo } from '../../types/user-types.js';

export const usersStateSyncSpec: StateSyncSpec<UserInfo> = Object.freeze({
  hashKey: 'userInfos',
  innerHashSpec: {
    hashKey: 'userInfo',
    deleteKey: 'deleteUserInfoIDs',
    rawInfosKey: 'userInfos',
    additionalDeleteCondition(user: UserInfo) {
      return !user.username;
    },
  },
});
