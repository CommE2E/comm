// @flow

import * as React from 'react';

import { useFindUserIdentities } from '../actions/find-user-identities-actions.js';
import { useSelector } from '../utils/redux-utils.js';

function useUsersSupportThickThreads(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<$ReadOnlyMap<string, boolean | void>> {
  const findUserIdentities = useFindUserIdentities();
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      const usersSupportingThickThreads = new Map<string, boolean | void>();

      const usersNeedingFetch = [];
      for (const userID of userIDs) {
        if (auxUserInfos[userID]?.deviceList) {
          usersSupportingThickThreads.set(userID, true);
        } else {
          usersNeedingFetch.push(userID);
        }
      }
      if (usersNeedingFetch.length > 0) {
        const { identities, reservedUserIdentifiers } =
          await findUserIdentities(usersNeedingFetch);
        for (const userID of usersNeedingFetch) {
          const isReserved = !!reservedUserIdentifiers[userID];
          const doesNotExist = identities[userID] === undefined && !isReserved;
          if (identities[userID]) {
            usersSupportingThickThreads.set(userID, true);
          } else if (doesNotExist) {
            usersSupportingThickThreads.set(userID, undefined);
          } else {
            usersSupportingThickThreads.set(userID, false);
          }
        }
      }
      return usersSupportingThickThreads;
    },
    [auxUserInfos, findUserIdentities],
  );
}

export { useUsersSupportThickThreads };
