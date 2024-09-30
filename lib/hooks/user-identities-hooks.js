// @flow

import * as React from 'react';

import { useAllowOlmViaTunnelbrokerForDMs } from './flag-hooks.js';
import { useFindUserIdentities } from '../actions/find-user-identities-actions.js';
import { userHasDeviceList } from '../shared/thread-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useUsersSupportThickThreads(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<$ReadOnlySet<string>> {
  const findUserIdentities = useFindUserIdentities();
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const allowOlmViaTunnelbrokerForDMs = useAllowOlmViaTunnelbrokerForDMs();

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      const usersSupportingThickThreads = new Set<string>();

      if (!allowOlmViaTunnelbrokerForDMs) {
        return usersSupportingThickThreads;
      }

      const usersNeedingFetch = [];
      for (const userID of userIDs) {
        if (userHasDeviceList(userID, auxUserInfos)) {
          usersSupportingThickThreads.add(userID);
        } else {
          usersNeedingFetch.push(userID);
        }
      }
      if (usersNeedingFetch.length > 0) {
        const { identities } = await findUserIdentities(usersNeedingFetch);
        for (const userID of usersNeedingFetch) {
          if (identities[userID]) {
            usersSupportingThickThreads.add(userID);
          }
        }
      }
      return usersSupportingThickThreads;
    },
    [allowOlmViaTunnelbrokerForDMs, auxUserInfos, findUserIdentities],
  );
}

export { useUsersSupportThickThreads };
