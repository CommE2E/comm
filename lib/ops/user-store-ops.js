// @flow

import { type BaseStoreOpsHandlers } from './base-ops.js';
import type { UserInfo, UserInfos } from '../types/user-types.js';
import { values } from '../utils/objects.js';

// client types
export type ReplaceUserOperation = {
  +type: 'replace_user',
  +payload: UserInfo,
};

export type RemoveUsersOperation = {
  +type: 'remove_users',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllUsersOperation = {
  +type: 'remove_all_users',
};

export type UserStoreOperation =
  | ReplaceUserOperation
  | RemoveUsersOperation
  | RemoveAllUsersOperation;

// SQLite types
export type ClientDBUserInfo = {
  +id: string,
  +userInfo: string,
};

export type ClientDBReplaceUserOperation = {
  +type: 'replace_user',
  +payload: ClientDBUserInfo,
};

export type ClientDBUserStoreOperation =
  | ClientDBReplaceUserOperation
  | RemoveUsersOperation
  | RemoveAllUsersOperation;

function convertUserInfosToReplaceUserOps(
  userInfos: UserInfos,
): $ReadOnlyArray<UserStoreOperation> {
  return values(userInfos).map(userInfo => ({
    type: 'replace_user',
    payload: userInfo,
  }));
}

function convertUserInfoToClientDBUserInfo(user: UserInfo): ClientDBUserInfo {
  return {
    id: user.id,
    userInfo: JSON.stringify(user),
  };
}

const userStoreOpsHandlers: BaseStoreOpsHandlers<
  UserInfos,
  UserStoreOperation,
  ClientDBUserStoreOperation,
  UserInfos,
  ClientDBUserInfo,
> = {
  processStoreOperations(
    userInfos: UserInfos,
    ops: $ReadOnlyArray<UserStoreOperation>,
  ): UserInfos {
    if (ops.length === 0) {
      return userInfos;
    }

    let processedUserInfos = { ...userInfos };
    for (const operation: UserStoreOperation of ops) {
      if (operation.type === 'replace_user') {
        processedUserInfos[operation.payload.id] = operation.payload;
      } else if (operation.type === 'remove_users') {
        for (const id of operation.payload.ids) {
          delete processedUserInfos[id];
        }
      } else if (operation.type === 'remove_all_users') {
        processedUserInfos = {};
      }
    }
    return processedUserInfos;
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<UserStoreOperation>,
  ): $ReadOnlyArray<ClientDBUserStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(operation => {
      if (
        operation.type === 'remove_users' ||
        operation.type === 'remove_all_users'
      ) {
        return operation;
      }
      return {
        type: 'replace_user',
        payload: convertUserInfoToClientDBUserInfo(operation.payload),
      };
    });
  },
  translateClientDBData(users: $ReadOnlyArray<ClientDBUserInfo>): UserInfos {
    const userInfos: { [id: string]: UserInfo } = {};
    users.forEach(dbUser => {
      userInfos[dbUser.id] = JSON.parse(dbUser.userInfo);
    });

    return userInfos;
  },
};

export {
  userStoreOpsHandlers,
  convertUserInfosToReplaceUserOps,
  convertUserInfoToClientDBUserInfo,
};
