// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types';
import { type UserInfo } from '../../types/user-types.js';
import { combineUnorderedHashes, hash } from '../../utils/objects.js';

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
  selector: createSelector(
    (state: AppState) => state.userStore.userInfos,
    userInfos => ({
      ...usersStateSyncSpec,
      getInfoHash: id => hash(userInfos[id]),
      getAllInfosHash: () =>
        combineUnorderedHashes(Object.values(userInfos).map(hash)),
      getIDs: () => Object.keys(userInfos),
    }),
  ),
});
