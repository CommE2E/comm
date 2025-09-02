// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useFindUserIdentities } from '../actions/find-user-identities-actions.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { FarcasterUser } from '../types/identity-service-types.js';
import type { AccountUserInfo } from '../types/user-types.js';
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

function useUsersSupportFarcasterDCs(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<$ReadOnlyMap<string, boolean | void>> {
  const findUserIdentities = useFindUserIdentities();
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);

  return React.useCallback(
    async (userIDs: $ReadOnlyArray<string>) => {
      const usersSupportingFCDCs = new Map<string, boolean | void>();

      const usersNeedingFetch = [];
      for (const userID of userIDs) {
        if (auxUserInfos[userID]?.supportsFarcasterDCs) {
          usersSupportingFCDCs.set(userID, true);
        } else {
          usersNeedingFetch.push(userID);
        }
      }
      if (usersNeedingFetch.length > 0) {
        const { identities, reservedUserIdentifiers } =
          await findUserIdentities(usersNeedingFetch);
        for (const userID of usersNeedingFetch) {
          // for reserved users, we set DCs support to false
          const isReserved = !!reservedUserIdentifiers[userID];
          const doesNotExist = identities[userID] === undefined && !isReserved;

          if (identities[userID]?.hasFarcasterDCsToken) {
            usersSupportingFCDCs.set(userID, true);
          } else if (doesNotExist) {
            usersSupportingFCDCs.set(userID, undefined);
          } else {
            usersSupportingFCDCs.set(userID, false);
          }
        }
      }
      return usersSupportingFCDCs;
    },
    [auxUserInfos, findUserIdentities],
  );
}

function useUsersSupportingProtocols(users: $ReadOnlyArray<AccountUserInfo>): {
  +allUsersSupportThickThreads: boolean,
  +allUsersSupportFarcasterThreads: boolean,
} {
  const checkUsersThickThreadSupport = useUsersSupportThickThreads();
  const [allUsersSupportThickThreads, setAllUsersSupportThickThreads] =
    React.useState(false);
  React.useEffect(() => {
    void (async () => {
      if (users.length === 0) {
        return;
      }
      const usersSupportingThickThreads = await checkUsersThickThreadSupport(
        users.map(user => user.id),
      );
      setAllUsersSupportThickThreads(
        users.every(userInfo => usersSupportingThickThreads.get(userInfo.id)),
      );
    })();
  }, [checkUsersThickThreadSupport, users]);

  const checkUsersFarcasterDCsSupport = useUsersSupportFarcasterDCs();
  const [allUsersSupportFarcasterThreads, setAllUsersSupportFarcasterThreads] =
    React.useState(false);

  React.useEffect(() => {
    void (async () => {
      if (users.length === 0) {
        return;
      }
      const usersSupportingThickThreads = await checkUsersFarcasterDCsSupport(
        users.map(user => user.id),
      );
      setAllUsersSupportFarcasterThreads(
        users.every(userInfo => usersSupportingThickThreads.get(userInfo.id)),
      );
    })();
  }, [checkUsersFarcasterDCsSupport, checkUsersThickThreadSupport, users]);

  return React.useMemo(
    () => ({ allUsersSupportThickThreads, allUsersSupportFarcasterThreads }),
    [allUsersSupportFarcasterThreads, allUsersSupportThickThreads],
  );
}

export type FCUserInfos = $ReadOnlyMap<string, FarcasterUser | void>;
export type GetCommFCUsersForFIDs = (
  farcasterIDs: $ReadOnlyArray<string | number>,
) => Promise<FCUserInfos>;

function useGetCommFCUsersForFIDs(): GetCommFCUsersForFIDs {
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const userInfos = useSelector(state => state.userStore.userInfos);

  const identityClientContext = React.useContext(IdentityClientContext);
  invariant(identityClientContext, 'NeynarClientContext is missing');

  const { identityClient } = identityClientContext;

  return React.useCallback(
    async (farcasterIDs: $ReadOnlyArray<string | number>) => {
      const fcUsers = new Map<string, FarcasterUser | void>();
      const unresolvedFIDs = new Set(farcasterIDs.map(fid => `${fid}`));

      for (const [userID, auxUserInfo] of Object.entries(auxUserInfos)) {
        const { fid, supportsFarcasterDCs } = auxUserInfo;

        const username = userInfos[userID]?.username;
        if (fid && username && unresolvedFIDs.delete(fid)) {
          fcUsers.set(fid, {
            userID,
            farcasterID: fid,
            username,
            supportsFarcasterDCs: !!supportsFarcasterDCs,
          });
        }
      }

      if (unresolvedFIDs.size > 0) {
        const fetchedInfos = await identityClient.getFarcasterUsers([
          ...unresolvedFIDs,
        ]);
        for (const fcUserInfo of fetchedInfos) {
          fcUsers.set(fcUserInfo.farcasterID, fcUserInfo);
          unresolvedFIDs.delete(fcUserInfo.farcasterID);
        }
      }

      unresolvedFIDs.forEach(missingFID => fcUsers.set(missingFID, undefined));
      return fcUsers;
    },
    [userInfos, auxUserInfos, identityClient],
  );
}

export {
  useUsersSupportThickThreads,
  useUsersSupportFarcasterDCs,
  useGetCommFCUsersForFIDs,
  useUsersSupportingProtocols,
};
