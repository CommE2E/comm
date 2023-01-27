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

describe('getNameForAddress', () => {
  it('should fail to return ashoat.eth if not in cache', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const obviouslyAshoatEth = ensCache.getCachedNameForAddress(
      '0x911413ef4127910d79303483f7470d095f399ca9',
    );
    expect(obviouslyAshoatEth).toBe(undefined);
  });
  it('should return ashoat.eth', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const obviouslyAshoatEth = await ensCache.getNameForAddress(
      '0x911413ef4127910d79303483f7470d095f399ca9',
    );
    expect(obviouslyAshoatEth).toBe('ashoat.eth');
  });
  it('should return ashoat.eth if in cache', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const obviouslyAshoatEth = ensCache.getCachedNameForAddress(
      '0x911413ef4127910d79303483f7470d095f399ca9',
    );
    expect(obviouslyAshoatEth).toBe('ashoat.eth');
  });
  it('should have ashoat.eth cached', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const timesLookupAddressCalledBefore = timesLookupAddressCalled;
    const obviouslyAshoatEth = await ensCache.getNameForAddress(
      '0x911413ef4127910d79303483f7470d095f399ca9',
    );
    expect(obviouslyAshoatEth).toBe('ashoat.eth');
    expect(timesLookupAddressCalled).toBe(timesLookupAddressCalledBefore);
  });
});

describe('getAddressForName', () => {
  it("should fail to return ashoat.eth's address if not in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddr = ensCache.getCachedAddressForName('ashoat.eth');
    expect(ashoatAddr).toBe(undefined);
  });
  it("should return ashoat.eth's address", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddr = await ensCache.getAddressForName('ashoat.eth');
    expect(ashoatAddr).toBe('0x911413ef4127910d79303483f7470d095f399ca9');
  });
  it("should return ashoat.eth's address if in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAddr = ensCache.getCachedAddressForName('ashoat.eth');
    expect(ashoatAddr).toBe('0x911413ef4127910d79303483f7470d095f399ca9');
  });
  it("should have ashoat.eth's address cached", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const timesResolveNameCalledBefore = timesResolveNameCalled;
    const ashoatAddr = await ensCache.getAddressForName('ashoat.eth');
    expect(ashoatAddr).toBe('0x911413ef4127910d79303483f7470d095f399ca9');
    expect(timesResolveNameCalled).toBe(timesResolveNameCalledBefore);
  });
});
