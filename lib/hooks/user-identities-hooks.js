// @flow

import * as React from 'react';

import { useAllowOlmViaTunnelbrokerForDMs } from './flag-hooks.js';
import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import { userHasDeviceList } from '../shared/thread-utils.js';
import type { UserIdentitiesResponse } from '../types/identity-service-types.js';
import { useSelector } from '../utils/redux-utils.js';

const findUserIdentitiesActionTypes = Object.freeze({
  started: 'FIND_USER_IDENTITIES_STARTED',
  success: 'FIND_USER_IDENTITIES_SUCCESS',
  failed: 'FIND_USER_IDENTITIES_FAILED',
});

function useFindUserIdentities(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<UserIdentitiesResponse> {
  const userIdentityCache = useUserIdentityCache();
  return userIdentityCache.getUserIdentities;
}

function useUserSupportThickThread(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<$ReadOnlyArray<string>> {
  const findUserIdentities = useFindUserIdentities();
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const allowOlmViaTunnelbrokerForDMs = useAllowOlmViaTunnelbrokerForDMs();

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      if (!allowOlmViaTunnelbrokerForDMs) {
        return [];
      }
      const usersSupportingThickThreads = [];
      const usersNeedsFetch = [];
      for (const userID of userIDs) {
        if (userHasDeviceList(userID, auxUserInfos)) {
          usersSupportingThickThreads.push(userID);
        } else {
          usersNeedsFetch.push(userID);
        }
      }
      if (usersNeedsFetch.length > 0) {
        const { identities } = await findUserIdentities(usersNeedsFetch);
        for (const userID of usersNeedsFetch) {
          if (identities[userID]) {
            usersSupportingThickThreads.push(userID);
          }
        }
      }
      return usersSupportingThickThreads;
    },
    [allowOlmViaTunnelbrokerForDMs, auxUserInfos, findUserIdentities],
  );
}

export {
  useUserSupportThickThread,
  useFindUserIdentities,
  findUserIdentitiesActionTypes,
};
