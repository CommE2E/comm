// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types';
import {
  type UserInfo,
  type UserInfos,
  userInfosValidator,
} from '../../types/user-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { combineUnorderedHashes, hash } from '../../utils/objects.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const usersStateSyncSpec: StateSyncSpec<UserInfos, UserInfo> =
  Object.freeze({
    hashKey: 'userInfos',
    innerHashSpec: {
      hashKey: 'userInfo',
      deleteKey: 'deleteUserInfoIDs',
      rawInfosKey: 'userInfos',
      additionalDeleteCondition(user: UserInfo) {
        return !user.username;
      },
    },
    convertClientToServerInfos(infos: UserInfos) {
      return convertClientIDsToServerIDs(
        ashoatKeyserverID,
        userInfosValidator,
        infos,
      );
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
