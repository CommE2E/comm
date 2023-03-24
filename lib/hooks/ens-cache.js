// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ENSCacheContext } from '../components/ens-cache-provider.react.js';
import { userIdentifiedByETHAddress } from '../shared/account-utils.js';
import { stringForUser } from '../shared/user-utils.js';

type BaseUserInfo = { +username?: ?string, ... };
function useENSNames<T: ?BaseUserInfo>(users: $ReadOnlyArray<T>): T[] {
  const cacheContext = React.useContext(ENSCacheContext);
  const { ensCache } = cacheContext;

  const cachedInfo = React.useMemo(
    () =>
      users.map(user => {
        if (!user) {
          return user;
        }
        const { username } = user;
        const ethAddress =
          username && userIdentifiedByETHAddress(user) ? username : null;
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
    const needFetch = cachedInfo
      .map(user => {
        if (!user) {
          return null;
        }
        const { ethAddress, cachedResult } = user;
        if (cachedResult || !ethAddress || fetchedAddresses.has(ethAddress)) {
          return null;
        }
        return ethAddress;
      })
      .filter(Boolean);
    if (needFetch.length === 0) {
      return;
    }
    setFetchedAddresses(oldFetchedAddresses => {
      const newFetchedAddresses = new Set(oldFetchedAddresses);
      for (const ethAddress of needFetch) {
        newFetchedAddresses.add(ethAddress);
      }
      return newFetchedAddresses;
    });
    for (const ethAddress of needFetch) {
      (async () => {
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
  }, [cachedInfo, fetchedAddresses, ensCache]);

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

function useStringForUser(
  user: ?{ +username?: ?string, +isViewer?: ?boolean, ... },
): ?string {
  const toFetch = user?.isViewer ? null : user;
  // stringForUser ignores username is isViewer, so we skip the ENS fetch
  const [result] = useENSNames([toFetch]);
  if (user?.isViewer) {
    return stringForUser(user);
  } else if (result) {
    return stringForUser(result);
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
    (async () => {
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

export { useENSNames, useENSName, useStringForUser, useENSAvatar };
