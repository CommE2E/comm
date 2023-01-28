// @flow

import namehash from 'eth-ens-namehash';

const cacheTimeout = 24 * 60 * 60 * 1000; // one day

export type EthersProvider = {
  +lookupAddress: (address: string) => Promise<?string>,
  +resolveName: (name: string) => Promise<?string>,
  ...
};
type ENSNameQueryCacheEntry = {
  // We normalize ETH addresses to lowercase characters
  +normalizedETHAddress: string,
  +cacheInsertionTime: number,
  // We normalize ENS names using eth-ens-namehash
  +normalizedENSName: ?string,
};
type ENSAddressQueryCacheEntry = {
  +normalizedENSName: string,
  +cacheInsertionTime: number,
  +normalizedETHAddress: ?string,
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
  provider: EthersProvider;
  // Maps from normalized ETH address to a cache entry for that address
  nameQueryCache: Map<string, ENSNameQueryCacheEntry> = new Map();
  // Maps from normalized ETH name to a cache entry for that name
  addressQueryCache: Map<string, ENSAddressQueryCacheEntry> = new Map();

  constructor(provider: EthersProvider) {
    this.provider = provider;
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
  async getNameForAddress(ethAddress: string): Promise<?string> {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult = this.getCachedNameForAddress(normalizedETHAddress);
    if (cacheResult) {
      return cacheResult;
    }

    const fetchENSNamePromise = (async () => {
      // ethers.js handles checking forward resolution (point 1 above) for us
      const ensName = await this.provider.lookupAddress(normalizedETHAddress);
      if (!ensName) {
        return undefined;
      }

      const normalizedENSName = normalizeENSName(ensName);
      if (normalizedENSName !== ensName) {
        return undefined;
      }

      return normalizedENSName;
    })();

    const normalizedENSName = await fetchENSNamePromise;
    this.nameQueryCache.set(normalizedETHAddress, {
      normalizedETHAddress,
      cacheInsertionTime: Date.now(),
      normalizedENSName,
    });
    return normalizedENSName;
  }

  getCachedNameForAddress(ethAddress: string): ?string {
    const normalizedETHAddress = normalizeETHAddress(ethAddress);

    const cacheResult = this.nameQueryCache.get(normalizedETHAddress);
    if (!cacheResult) {
      return undefined;
    }

    const { cacheInsertionTime, normalizedENSName } = cacheResult;
    if (cacheInsertionTime + cacheTimeout <= Date.now()) {
      this.nameQueryCache.delete(normalizedETHAddress);
      return undefined;
    }

    return normalizedENSName;
  }

  async getAddressForName(ensName: string): Promise<?string> {
    const normalizedENSName = normalizeENSName(ensName);
    if (normalizedENSName !== ensName) {
      return undefined;
    }

    const cacheResult = this.getCachedAddressForName(normalizedENSName);
    if (cacheResult) {
      return cacheResult;
    }

    const fetchETHAddressPromise = (async () => {
      const ethAddress = await this.provider.resolveName(normalizedENSName);
      if (!ethAddress) {
        return undefined;
      }
      return normalizeETHAddress(ethAddress);
    })();

    const normalizedETHAddress = await fetchETHAddressPromise;
    this.addressQueryCache.set(normalizedENSName, {
      normalizedENSName,
      cacheInsertionTime: Date.now(),
      normalizedETHAddress,
    });
    return normalizedETHAddress;
  }

  getCachedAddressForName(ensName: string): ?string {
    const normalizedENSName = normalizeENSName(ensName);
    if (normalizedENSName !== ensName) {
      return undefined;
    }

    const cacheResult = this.addressQueryCache.get(normalizedENSName);
    if (!cacheResult) {
      return undefined;
    }

    const { cacheInsertionTime, normalizedETHAddress } = cacheResult;
    if (cacheInsertionTime + cacheTimeout <= Date.now()) {
      this.addressQueryCache.delete(normalizedENSName);
      return undefined;
    }

    return normalizedETHAddress;
  }
}

export { ENSCache };
