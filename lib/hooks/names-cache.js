// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useFCNames } from './fc-cache.js';
import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { getETHAddressForUserInfo } from '../shared/account-utils.js';
import { extractFIDFromUserID } from '../shared/id-utils.js';
import { stringForUser, stringForUserExplicit } from '../shared/user-utils.js';
import { getENSNames } from '../utils/ens-helpers.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseResolvableUserInfo = {
  +id?: ?string,
  +fid?: ?string,
  +username?: ?string,
  +farcasterUsername?: ?string,
  ...
};
type UseResolvableNamesOptions = {
  +allAtOnce?: ?boolean,
};
function useResolvableNames<T: ?BaseResolvableUserInfo>(
  users: $ReadOnlyArray<T>,
  options?: ?UseResolvableNamesOptions,
): T[] {
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);

  const usersWithFIDs = React.useMemo(
    () =>
      users.map(user => {
        if (!user?.id || user?.fid) {
          return user;
        }

        const userID = user.id;
        const fid = extractFIDFromUserID(userID) ?? auxUserInfos[userID]?.fid;
        return { ...user, fid };
      }),
    [users, auxUserInfos],
  );

  // We resolve both FC and ENS names to handle Ethereum wallet users with
  // connected Farcaster account - they have both `username` (ETH address)
  // and `farcasterUsername` present.
  const resolvedFCNames = useFCNames(usersWithFIDs, options);
  const resolvedFCAndESNNames = useENSNames(resolvedFCNames, options);

  return resolvedFCAndESNNames;
}

type BaseUserInfo = { +username?: ?string, ... };
type UseENSNamesOptions = {
  +allAtOnce?: ?boolean,
};
function useENSNames<T: ?BaseUserInfo>(
  users: $ReadOnlyArray<T>,
  options?: ?UseENSNamesOptions,
): T[] {
  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;
  const allAtOnce = options?.allAtOnce ?? false;

  const cachedInfo = React.useMemo(
    () =>
      users.map(user => {
        if (!user) {
          return user;
        }
        const ethAddress = getETHAddressForUserInfo(user);
        const cachedResult =
          ethAddress && ensCache
            ? ensCache.getCachedNameForAddress(ethAddress)
            : null;
        return {
          input: user,
          ethAddress,
          cachedResult,
        };
      }),
    [users, ensCache],
  );

  const [fetchedAddresses, setFetchedAddresses] = React.useState<
    $ReadOnlySet<string>,
  >(new Set());
  const [ensNames, setENSNames] = React.useState<$ReadOnlyMap<string, string>>(
    new Map(),
  );

  React.useEffect(() => {
    if (!ensCache) {
      return;
    }

    const needFetchUsers: $ReadOnlyArray<{ +username: string }> = cachedInfo
      .map(user => {
        if (!user) {
          return null;
        }
        const { ethAddress, cachedResult } = user;
        if (cachedResult || !ethAddress || fetchedAddresses.has(ethAddress)) {
          return null;
        }
        return { username: ethAddress };
      })
      .filter(Boolean);
    if (needFetchUsers.length === 0) {
      return;
    }

    const needFetchAddresses = needFetchUsers.map(({ username }) => username);
    setFetchedAddresses(oldFetchedAddresses => {
      const newFetchedAddresses = new Set(oldFetchedAddresses);
      for (const ethAddress of needFetchAddresses) {
        newFetchedAddresses.add(ethAddress);
      }
      return newFetchedAddresses;
    });

    if (allAtOnce) {
      void (async () => {
        const withENSNames = await getENSNames(ensCache, needFetchUsers);
        setENSNames(oldENSNames => {
          const newENSNames = new Map(oldENSNames);
          for (let i = 0; i < withENSNames.length; i++) {
            const ethAddress = needFetchAddresses[i];
            const result = withENSNames[i].username;
            newENSNames.set(ethAddress, result);
          }
          return newENSNames;
        });
      })();
      return;
    }

    for (const ethAddress of needFetchAddresses) {
      void (async () => {
        const result = await ensCache.getNameForAddress(ethAddress);
        if (!result) {
          return;
        }
        setENSNames(oldENSNames => {
          const newENSNames = new Map(oldENSNames);
          newENSNames.set(ethAddress, result);
          return newENSNames;
        });
      })();
    }
  }, [cachedInfo, fetchedAddresses, ensCache, allAtOnce]);

  return React.useMemo(
    () =>
      cachedInfo.map(user => {
        if (!user) {
          return user;
        }
        const { input, ethAddress, cachedResult } = user;
        if (cachedResult) {
          return { ...input, username: cachedResult };
        } else if (!ethAddress) {
          return input;
        }
        const ensName = ensNames.get(ethAddress);
        if (ensName) {
          return { ...input, username: ensName };
        }
        return input;
      }),
    [cachedInfo, ensNames],
  );
}

function useENSName(username: string): string {
  const usersObjArr = React.useMemo(() => [{ username }], [username]);
  const [potentiallyENSUser] = useENSNames<{ +username: string }>(usersObjArr);
  return potentiallyENSUser.username;
}

function useResolvedUsername(
  userInfo: ?BaseResolvableUserInfo,
  preferFarcaster?: boolean,
): string {
  const [result] = useResolvableNames([userInfo]);
  return stringForUserExplicit(result, preferFarcaster);
}

function useStringForUser(
  user: ?{
    +id?: ?string,
    +fid?: ?string,
    +username?: ?string,
    +farcasterUsername?: ?string,
    +isViewer?: boolean,
    ...
  },
): ?string {
  // stringForUser ignores username is isViewer, so we skip the ENS fetch
  const toFetch = user?.isViewer ? null : user;
  const usersObjArr = React.useMemo(() => [toFetch], [toFetch]);

  const [result] = useResolvableNames(usersObjArr);
  if (user?.isViewer) {
    return stringForUser(user);
  } else if (result) {
    return stringForUser({ ...result, isViewer: false });
  } else {
    invariant(
      !user,
      'the only way result can be falsey is if useENSNames is passed a ' +
        'falsey input, and that can only happen if useStringForUser input is ' +
        'falsey or isViewer is set',
    );
    return user;
  }
}

function useENSAvatar(ethAddress: ?string): ?string {
  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;

  const cachedAvatar = React.useMemo(() => {
    if (!ethAddress) {
      return ethAddress;
    }
    if (!ensCache) {
      return null;
    }
    return ensCache.getCachedAvatarURIForAddress(ethAddress);
  }, [ensCache, ethAddress]);

  const [ensAvatars, setENSAvatars] = React.useState<
    $ReadOnlyMap<string, string>,
  >(new Map());

  React.useEffect(() => {
    if (!ensCache || !ethAddress || cachedAvatar !== undefined) {
      return;
    }
    void (async () => {
      const result = await ensCache.getAvatarURIForAddress(ethAddress);
      if (!result) {
        return;
      }
      setENSAvatars(oldENSAvatars => {
        const newENSAvatars = new Map(oldENSAvatars);
        newENSAvatars.set(ethAddress, result);
        return newENSAvatars;
      });
    })();
  }, [ensCache, cachedAvatar, ethAddress]);

  return React.useMemo(() => {
    if (!ethAddress) {
      return ethAddress;
    } else if (cachedAvatar !== undefined) {
      return cachedAvatar;
    } else {
      return ensAvatars.get(ethAddress);
    }
  }, [ethAddress, cachedAvatar, ensAvatars]);
}

type BaseENSResolvedUser = {
  +username?: ?string,
  +farcasterUsername?: ?string,
  +isViewer?: ?boolean,
  ...
};
function useSortedENSResolvedUsers<T: BaseENSResolvedUser>(
  userInfos: $ReadOnlyArray<T>,
): $ReadOnlyArray<T> {
  const ensResolvedUsers = useENSNames(userInfos);

  return React.useMemo(
    () =>
      ensResolvedUsers.sort((userInfo1, userInfo2) =>
        stringForUser(userInfo1).localeCompare(stringForUser(userInfo2)),
      ),
    [ensResolvedUsers],
  );
}

export {
  useENSNames,
  useENSName,
  useStringForUser,
  useENSAvatar,
  useSortedENSResolvedUsers,
  useResolvableNames,
  useResolvedUsername,
};
