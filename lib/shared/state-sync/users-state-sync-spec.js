// @flow

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type UserInfo,
  type UserInfos,
  userInfosValidator,
} from '../../types/user-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
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
  });
