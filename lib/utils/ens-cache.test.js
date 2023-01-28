// @flow

import { ethers } from 'ethers';

import { ENSCache } from './ens-cache';

const provider = new ethers.providers.AlchemyProvider(
  'mainnet',
  process.env.ALCHEMY_API_KEY,
);
const ensCache = new ENSCache(provider);

const baseLookupAddress = provider.lookupAddress.bind(provider);
let timesLookupAddressCalled = 0;
provider.lookupAddress = (ethAddress: string) => {
  timesLookupAddressCalled++;
  return baseLookupAddress(ethAddress);
};

const baseResolveName = provider.resolveName.bind(provider);
let timesResolveNameCalled = 0;
provider.resolveName = (ensName: string) => {
  timesResolveNameCalled++;
  return baseResolveName(ensName);
};

if (!process.env.ALCHEMY_API_KEY) {
  // Test only works if we can query blockchain
  console.log(
    'skipped running ENSCache tests because of missing ALCHEMY_API_KEY ' +
      'environmental variable',
  );
}

const ashoatDotEth = 'ashoat.eth';
const ashoatAddr = '0x911413ef4127910d79303483f7470d095f399ca9';

describe('getNameForAddress', () => {
  it('should fail to return ashoat.eth if not in cache', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatEthResult = ensCache.getCachedNameForAddress(ashoatAddr);
    expect(ashoatEthResult).toBe(undefined);
  });
  it('should return ashoat.eth', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatEthResult = await ensCache.getNameForAddress(ashoatAddr);
    expect(ashoatEthResult).toBe(ashoatDotEth);
  });
  it('should return ashoat.eth if in cache', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatEthResult = ensCache.getCachedNameForAddress(ashoatAddr);
    expect(ashoatEthResult).toBe(ashoatDotEth);
  });
  it('should have ashoat.eth cached', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const timesLookupAddressCalledBefore = timesLookupAddressCalled;
    const ashoatEthResult = await ensCache.getNameForAddress(ashoatAddr);
    expect(ashoatEthResult).toBe(ashoatDotEth);
    expect(timesLookupAddressCalled).toBe(timesLookupAddressCalledBefore);
  });
});

describe('getAddressForName', () => {
  it("should fail to return ashoat.eth's address if not in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddrResult = ensCache.getCachedAddressForName(ashoatDotEth);
    expect(ashoatAddrResult).toBe(undefined);
  });
  it("should return ashoat.eth's address", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddrResult = await ensCache.getAddressForName(ashoatDotEth);
    expect(ashoatAddrResult).toBe(ashoatAddr);
  });
  it("should return ashoat.eth's address if in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddrResult = ensCache.getCachedAddressForName(ashoatDotEth);
    expect(ashoatAddrResult).toBe(ashoatAddr);
  });
  it("should have ashoat.eth's address cached", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const timesResolveNameCalledBefore = timesResolveNameCalled;
    const ashoatAddrResult = await ensCache.getAddressForName(ashoatDotEth);
    expect(ashoatAddrResult).toBe(ashoatAddr);
    expect(timesResolveNameCalled).toBe(timesResolveNameCalledBefore);
  });
});
