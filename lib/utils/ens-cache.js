// @flow

import namehash from 'eth-ens-namehash';

import { ENSWrapper } from './ens-wrapper.js';
import sleep from './sleep.js';

const cacheTimeout = 24 * 60 * 60 * 1000; // one day
const failedQueryCacheTimeout = 5 * 60 * 1000; // five minutes
const queryTimeout = 30 * 1000; // ten seconds

async function throwOnTimeout(identifier: string) {
  await sleep(queryTimeout);
  throw new Error(`ENS fetch for ${identifier} timed out`);
}

type ENSNameQueryCacheEntry = {
  // We normalize ETH addresses to lowercase characters
  +normalizedETHAddress: string,
  +expirationTime: number,
  // We normalize ENS names using eth-ens-namehash
  +normalizedENSName: ?string | Promise<?string>,
};
type ENSAddressQueryCacheEntry = {
  +normalizedENSName: string,
  +expirationTime: number,
  +normalizedETHAddress: ?string | Promise<?string>,
};
type ENSAvatarQueryCacheEntry = {
  +normalizedETHAddress: string,
  +expirationTime: number,
  +avatarURI: ?string | Promise<?string>,
};

const normalizeETHAddress = (ethAddress: string) => ethAddress.toLowerCase();

// Note: this normalization is a little different than the ETH address
// normalization. The difference is that ETH addresses are
// case-insensitive, but a normalized ENS name is not the same as its input.
// Whereas we use normalizeETHAddress just to dedup inputs, we use this
// function to check if an ENS name matches its normalized ENS name, as a way
// to prevent homograph attacks.
// See https://docs.ens.domains/dapp-developer-guide/resolving-names#reverse-resolution
const normalizeENSName = (ensName: string) => namehash.normalize(ensName);

// We have a need for querying ENS names from both clients as well as from
// keyserver code. On the client side, we could use wagmi's caching behavior,
// but that doesn't work for keyserver since it's React-specific. To keep
// caching behavior consistent across platforms, we instead introduce this
// vanilla JS class that handles querying and caching ENS for all cases.
class ENSCache {
  ensWrapper: ENSWrapper;

  // Maps from normalized ETH address to a cache entry for its name
  nameQueryCache: Map<string, ENSNameQueryCacheEntry> = new Map();
  // Maps from normalized ETH name to a cache entry for its address
  addressQueryCache: Map<string, ENSAddressQueryCacheEntry> = new Map();
  // Maps from normalized ETH address to a cache entry for its avatar
  avatarQueryCache: Map<string, ENSAvatarQueryCacheEntry> = new Map();

  constructor(ensWrapper: ENSWrapper) {
    this.ensWrapper = ensWrapper;
  }

  // Getting a name for an ETH address is referred to as "reverse resolution".
  // 1. Since any address can set a reverse resolution to an arbitrary ENS name
  //    (without permission from the owner), this function will also perform a
  //    "forward resolution" to confirm that the owner of the ENS name has
  //    mapped it to this address
  // 2. We only consider an ENS name valid if it's equal to its normalized
  //    version via eth-ens-namehash. This is to protect against homograph
  //    attacks
  // If we fail to find an ENS name for an address, fail to confirm a matching
  // forward resolution, or if the ENS name does not equal its normalized
  // version, we will return undefined.
  getNameForAddress(ethAddress: string): Promise<?string> {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult = this.getCachedNameEntryForAddress(normalizedETHAddress);
    if (cacheResult) {
      return Promise.resolve(cacheResult.normalizedENSName);
    }

    const fetchENSNamePromise = (async () => {
      // ethers.js handles checking forward resolution (point 1 above) for us
      let ensName;
      try {
        ensName = await Promise.race([
          this.ensWrapper.getNameForAddress(normalizedETHAddress),
          throwOnTimeout(`${normalizedETHAddress}'s name`),
        ]);
      } catch (e) {
        console.log(e);
        return null;
      }
      if (!ensName) {
        return undefined;
      }

      const normalizedENSName = normalizeENSName(ensName);
      if (normalizedENSName !== ensName) {
        return undefined;
      }

      return normalizedENSName;
    })();

    this.nameQueryCache.set(normalizedETHAddress, {
      normalizedETHAddress,
      expirationTime: Date.now() + queryTimeout * 2,
      normalizedENSName: fetchENSNamePromise,
    });

    return (async () => {
      const normalizedENSName = await fetchENSNamePromise;
      const timeout =
        normalizedENSName === null ? failedQueryCacheTimeout : cacheTimeout;
      this.nameQueryCache.set(normalizedETHAddress, {
        normalizedETHAddress,
        expirationTime: Date.now() + timeout,
        normalizedENSName,
      });
      return normalizedENSName;
    })();
  }

  getNamesForAddresses(
    ethAddresses: $ReadOnlyArray<string>,
  ): Promise<Array<?string>> {
    const normalizedETHAddresses = ethAddresses.map(normalizeETHAddress);

    const cacheMatches = normalizedETHAddresses.map(ethAddress =>
      this.getCachedNameEntryForAddress(ethAddress),
    );
    const cacheResultsPromise = Promise.all(
      cacheMatches.map(match =>
        Promise.resolve(match ? match.normalizedENSName : match),
      ),
    );
    if (cacheMatches.every(Boolean)) {
      return cacheResultsPromise;
    }

    const needFetch = [];
    for (let i = 0; i < normalizedETHAddresses.length; i++) {
      const ethAddress = normalizedETHAddresses[i];
      const cacheMatch = cacheMatches[i];
      if (!cacheMatch) {
        needFetch.push(ethAddress);
      }
    }

    const fetchENSNamesPromise = (async () => {
      let ensNames: $ReadOnlyArray<?string>;
      try {
        const raceResult = await Promise.race([
          this.ensWrapper.getNamesForAddresses(needFetch),
          throwOnTimeout(`names for ${JSON.stringify(needFetch)}`),
        ]);
        ensNames = raceResult;
      } catch (e) {
        console.log(e);
        ensNames = new Array<?string>(needFetch.length).fill(null);
      }

      const resultMap = new Map<string, ?string>();
      for (let i = 0; i < needFetch.length; i++) {
        const ethAddress = needFetch[i];
        let ensName = ensNames[i];
        if (
          ensName !== null &&
          (!ensName || ensName !== normalizeENSName(ensName))
        ) {
          ensName = undefined;
        }
        resultMap.set(ethAddress, ensName);
      }

      return resultMap;
    })();

    for (let i = 0; i < needFetch.length; i++) {
      const normalizedETHAddress = needFetch[i];
      const fetchENSNamePromise = (async () => {
        const resultMap = await fetchENSNamesPromise;
        return resultMap.get(normalizedETHAddress) ?? null;
      })();
      this.nameQueryCache.set(normalizedETHAddress, {
        normalizedETHAddress,
        expirationTime: Date.now() + queryTimeout * 2,
        normalizedENSName: fetchENSNamePromise,
      });
    }

    return (async () => {
      const [resultMap, cacheResults] = await Promise.all([
        fetchENSNamesPromise,
        cacheResultsPromise,
      ]);
      for (let i = 0; i < needFetch.length; i++) {
        const normalizedETHAddress = needFetch[i];
        const normalizedENSName = resultMap.get(normalizedETHAddress);
        const timeout =
          normalizedENSName === null ? failedQueryCacheTimeout : cacheTimeout;
        this.nameQueryCache.set(normalizedETHAddress, {
          normalizedETHAddress,
          expirationTime: Date.now() + timeout,
          normalizedENSName,
        });
      }

      const results = [];
      for (let i = 0; i < normalizedETHAddresses.length; i++) {
        const cachedResult = cacheResults[i];
        if (cachedResult) {
          results.push(cachedResult);
        } else {
          const normalizedETHAddress = normalizedETHAddresses[i];
          results.push(resultMap.get(normalizedETHAddress));
        }
      }
      return results;
    })();
  }

  getCachedNameEntryForAddress(ethAddress: string): ?ENSNameQueryCacheEntry {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult = this.nameQueryCache.get(normalizedETHAddress);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.nameQueryCache.delete(normalizedETHAddress);
      return undefined;
    }

    return cacheResult;
  }

  getCachedNameForAddress(ethAddress: string): ?string {
    const cacheResult = this.getCachedNameEntryForAddress(ethAddress);
    if (!cacheResult) {
      return undefined;
    }

    const { normalizedENSName } = cacheResult;
    if (typeof normalizedENSName !== 'string') {
      return undefined;
    }

    return normalizedENSName;
  }

  getAddressForName(ensName: string): Promise<?string> {
    const normalizedENSName = normalizeENSName(ensName);
    if (normalizedENSName !== ensName) {
      return Promise.resolve(undefined);
    }

    const cacheResult = this.getCachedAddressEntryForName(normalizedENSName);
    if (cacheResult) {
      return Promise.resolve(cacheResult.normalizedETHAddress);
    }

    const fetchETHAddressPromise = (async () => {
      let ethAddress;
      try {
        ethAddress = await Promise.race([
          this.ensWrapper.getAddressForName(normalizedENSName),
          throwOnTimeout(`${normalizedENSName}'s address`),
        ]);
      } catch (e) {
        console.log(e);
        return null;
      }
      if (!ethAddress) {
        return undefined;
      }
      return normalizeETHAddress(ethAddress);
    })();

    this.addressQueryCache.set(normalizedENSName, {
      normalizedENSName,
      expirationTime: Date.now() + queryTimeout * 2,
      normalizedETHAddress: fetchETHAddressPromise,
    });

    return (async () => {
      const normalizedETHAddress = await fetchETHAddressPromise;
      const timeout =
        normalizedETHAddress === null ? failedQueryCacheTimeout : cacheTimeout;
      this.addressQueryCache.set(normalizedENSName, {
        normalizedENSName,
        expirationTime: Date.now() + timeout,
        normalizedETHAddress,
      });
      return normalizedETHAddress;
    })();
  }

  getCachedAddressEntryForName(ensName: string): ?ENSAddressQueryCacheEntry {
    const normalizedENSName = normalizeENSName(ensName);
    if (normalizedENSName !== ensName) {
      return undefined;
    }

    const cacheResult = this.addressQueryCache.get(normalizedENSName);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.addressQueryCache.delete(normalizedENSName);
      return undefined;
    }

    return cacheResult;
  }

  getCachedAddressForName(ensName: string): ?string {
    const cacheResult = this.getCachedAddressEntryForName(ensName);
    if (!cacheResult) {
      return undefined;
    }

    const { normalizedETHAddress } = cacheResult;
    if (typeof normalizedETHAddress !== 'string') {
      return undefined;
    }

    return normalizedETHAddress;
  }

  getAvatarURIForAddress(ethAddress: string): Promise<?string> {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult =
      this.getCachedAvatarEntryForAddress(normalizedETHAddress);
    if (cacheResult) {
      return Promise.resolve(cacheResult.avatarURI);
    }

    const fetchENSAvatarPromise = (async () => {
      const ensName = await this.getNameForAddress(normalizedETHAddress);
      if (!ensName) {
        return ensName;
      }
      let ensAvatar;
      try {
        ensAvatar = await Promise.race([
          this.ensWrapper.getAvatarURIForName(ensName),
          throwOnTimeout(`${normalizedETHAddress}'s avatar`),
        ]);
      } catch (e) {
        console.log(e);
        return null;
      }
      if (!ensAvatar) {
        return undefined;
      }
      return ensAvatar;
    })();

    this.avatarQueryCache.set(normalizedETHAddress, {
      normalizedETHAddress,
      expirationTime: Date.now() + queryTimeout * 4,
      avatarURI: fetchENSAvatarPromise,
    });

    return (async () => {
      const avatarURI = await fetchENSAvatarPromise;
      const timeout =
        avatarURI === null ? failedQueryCacheTimeout : cacheTimeout;
      this.avatarQueryCache.set(normalizedETHAddress, {
        normalizedETHAddress,
        expirationTime: Date.now() + timeout,
        avatarURI,
      });
      return avatarURI;
    })();
  }

  getCachedAvatarEntryForAddress(
    ethAddress: string,
  ): ?ENSAvatarQueryCacheEntry {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult = this.avatarQueryCache.get(normalizedETHAddress);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.avatarQueryCache.delete(normalizedETHAddress);
      return undefined;
    }

    return cacheResult;
  }

  getCachedAvatarURIForAddress(ethAddress: string): ?string {
    const cacheResult = this.getCachedAvatarEntryForAddress(ethAddress);
    if (!cacheResult) {
      return undefined;
    }

    const { avatarURI } = cacheResult;
    if (typeof avatarURI !== 'string') {
      return undefined;
    }

    return avatarURI;
  }

  clearCache(): void {
    this.nameQueryCache = new Map();
    this.addressQueryCache = new Map();
    this.avatarQueryCache = new Map();
  }
}

export { ENSCache };
