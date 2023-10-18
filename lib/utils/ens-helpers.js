// @flow

import { ENSCache } from './ens-cache.js';
import { getETHAddressForUserInfo } from '../shared/account-utils.js';

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
    const ethAddress = getETHAddressForUserInfo(user);
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
    const results = await ensCache.getNamesForAddresses(needFetch);
    for (let i = 0; i < needFetch.length; i++) {
      const ethAddress = needFetch[i];
      const result = results[i];
      if (result) {
        ensNames.set(ethAddress, result);
      }
    }
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
