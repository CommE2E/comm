// @flow

import { userIdentifiedByETHAddress } from '../shared/account-utils.js';
import { ENSCache } from './ens-cache.js';

type BaseUserInfo = { +username?: ?string, ... };
export type GetENSNames = <T: ?BaseUserInfo>(
  users: $ReadOnlyArray<T>,
) => Promise<T[]>;

async function getENSNames<T: ?BaseUserInfo>(
  ensCache: ENSCache,
  users: $ReadOnlyArray<T>,
): Promise<T[]> {
  const info = users.map(user => {
    if (!user) {
      return user;
    }
    const { username } = user;
    const ethAddress =
      username && userIdentifiedByETHAddress(user) ? username : null;
    const cachedResult = ethAddress
      ? ensCache.getCachedNameForAddress(ethAddress)
      : null;
    return {
      input: user,
      ethAddress,
      cachedResult,
    };
  });

  const needFetch = info
    .map(user => {
      if (!user) {
        return null;
      }
      const { ethAddress, cachedResult } = user;
      if (cachedResult || !ethAddress) {
        return null;
      }
      return ethAddress;
    })
    .filter(Boolean);

  const ensNames = new Map();
  if (needFetch.length > 0) {
    await Promise.all(
      needFetch.map(async (ethAddress: string) => {
        const ensName = await ensCache.getNameForAddress(ethAddress);
        if (ensName) {
          ensNames.set(ethAddress, ensName);
        }
      }),
    );
  }

  return info.map(user => {
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
  });
}

export { getENSNames };
