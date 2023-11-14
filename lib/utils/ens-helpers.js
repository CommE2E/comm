// @flow
import uts46 from 'idna-uts46-hx';

import { ENSCache } from './ens-cache.js';
import { getETHAddressForUserInfo } from '../shared/account-utils.js';
import { ensRegex } from '../shared/markdown.js';

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

function isValidENSName(name: string): boolean {
  // While the Ethereum spec allows for more flexibility in ENS names
  // (see https://eips.ethereum.org/EIPS/eip-137#name-syntax), we want to only
  // perform lookups on names that adhere to two specific rules:
  // 1. TLD should be .eth
  // 2. SLD should be at least three characters in length
  // Here, we enforce these rules and also use a library similar to the one
  // reccomended by the Ethereum spec to perform the 'heavy lifting' of
  // making sure the name adheres to all of the specific limitations.
  try {
    // Ethereum spec guidelines
    const convertedName = uts46.toAscii(name, {
      transitional: false,
      useStd3ASCII: true,
    });

    // Our specific rules on TLDs and SLDs
    return !!convertedName.match(ensRegex);
  } catch (e) {
    return false;
  }
}

export { getENSNames, isValidENSName };
