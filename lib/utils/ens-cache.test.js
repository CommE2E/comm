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

if (!process.env.ALCHEMY_API_KEY) {
  // Test only works if we can query blockchain
  console.log(
    'skipped running ENSCache tests because of missing ALCHEMY_API_KEY ' +
      'environmental variable',
  );
}

describe('getNameForAddress', () => {
  it('should return ashoat.eth', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const obviouslyAshoatEth = await ensCache.getNameForAddress(
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
