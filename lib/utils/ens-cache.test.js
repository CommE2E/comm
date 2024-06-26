// @flow

import { AlchemyProvider } from 'ethers';

import { ENSCache } from './ens-cache.js';

const provider = new AlchemyProvider('sepolia', process.env.ALCHEMY_API_KEY);
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

const baseGetAvatar = provider.getAvatar.bind(provider);
let timesGetAvatarCalled = 0;
provider.getAvatar = (ethAddress: string) => {
  timesGetAvatarCalled++;
  return baseGetAvatar(ethAddress);
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
const ashoatAvatar = 'https://ashoat.com/small_searching.png';

const commalphaDotEth = 'commalpha.eth';
const commalphaEthAddr = '0x727ad7F5134C03e88087a8019b80388b22aaD24d';
const commalphaEthAvatar =
  'https://gateway.ipfs.io/ipfs/Qmb6CCsr5Hvv1DKr9Yt9ucbaK8Fz9MUP1kW9NTqAJhk7o8';

const commbetaDotEth = 'commbeta.eth';
const commbetaEthAddr = '0x07124c3b6687e78aec8f13a2312cba72a0bed387';
const commbetaEthAvatar =
  'https://altlayer-image-store.alt.technology/msnft.png';

const noENSNameAddr = '0xcF986104d869967381dFfAb3A4127bCe6a404362';

describe('getNameForAddress', () => {
  beforeAll(() => {
    ensCache.clearCache();
  });
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
    const ashoatEthResult = await ensCache.getNameForAddress(
      ashoatAddr.toUpperCase(),
    );
    expect(ashoatEthResult).toBe(ashoatDotEth);
    expect(timesLookupAddressCalled).toBe(timesLookupAddressCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesLookupAddressCalledBeforeSingleFetch = timesLookupAddressCalled;
    const ashoatEthResult1 = await ensCache.getNameForAddress(ashoatAddr);
    expect(ashoatEthResult1).toBe(ashoatDotEth);
    const timesLookupAddressCalledForSingleFetch =
      timesLookupAddressCalled - timesLookupAddressCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesLookupAddressCalledBeforeDoubleFetch = timesLookupAddressCalled;
    const [ashoatEthResult2, ashoatEthResult3] = await Promise.all([
      ensCache.getNameForAddress(ashoatAddr),
      ensCache.getNameForAddress(ashoatAddr.toUpperCase()),
    ]);
    expect(ashoatEthResult2).toBe(ashoatDotEth);
    expect(ashoatEthResult3).toBe(ashoatDotEth);
    const timesLookupAddressCalledForDoubleFetch =
      timesLookupAddressCalled - timesLookupAddressCalledBeforeDoubleFetch;

    expect(timesLookupAddressCalledForDoubleFetch).toBe(
      timesLookupAddressCalledForSingleFetch,
    );
  });
});

describe('getNamesForAddresses', () => {
  beforeAll(() => {
    ensCache.clearCache();
  });
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
    const [ashoatEthResult] = await ensCache.getNamesForAddresses([ashoatAddr]);
    expect(ashoatEthResult).toBe(ashoatDotEth);
  });
  it('should return ashoat.eth if in cache', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatEthResult = ensCache.getCachedNameForAddress(ashoatAddr);
    expect(ashoatEthResult).toBe(ashoatDotEth);
  });
  it('should fetch multiple at a time', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const [ashoatEthResult, commalphaEthResult, commbetaEthResult] =
      await ensCache.getNamesForAddresses([
        ashoatAddr,
        commalphaEthAddr,
        commbetaEthAddr,
      ]);
    expect(ashoatEthResult).toBe(ashoatDotEth);
    expect(commalphaEthResult).toBe(commalphaDotEth);
    expect(commbetaEthResult).toBe(commbetaDotEth);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesLookupAddressCalledBefore = timesLookupAddressCalled;

    const [
      [ashoatEthResult1, commalphaEthResult1, commbetaEthResult1],
      ashoatEthResult2,
      commalphaEthResult2,
      commbetaEthResult2,
    ] = await Promise.all([
      ensCache.getNamesForAddresses([
        ashoatAddr,
        commalphaEthAddr,
        commbetaEthAddr,
      ]),
      ensCache.getNameForAddress(ashoatAddr),
      ensCache.getNameForAddress(commalphaEthAddr),
      ensCache.getNameForAddress(commbetaEthAddr),
    ]);

    const timesLookupAddressCalledAfter = timesLookupAddressCalled;
    const timesLookupAddressCalledDuringTest =
      timesLookupAddressCalledAfter - timesLookupAddressCalledBefore;

    // These tests are run on the Sepolia testnet, where the ReverseRecords
    // smart contract is not deployed. As a result, we end up needing to call
    // the lookupAddress method (single lookup) once for each address. On
    // mainnet (outside of these tests) this is 0, since the ReverseRecords
    // smart contract lets us batch up our requests, and avoid calling
    // lookupAddress entirely.
    expect(timesLookupAddressCalledDuringTest).toBe(3);

    expect(ashoatEthResult1).toBe(ashoatDotEth);
    expect(commalphaEthResult1).toBe(commalphaDotEth);
    expect(commbetaEthResult1).toBe(commbetaDotEth);
    expect(ashoatEthResult2).toBe(ashoatDotEth);
    expect(commalphaEthResult2).toBe(commalphaDotEth);
    expect(commbetaEthResult2).toBe(commbetaDotEth);
  });
  it('should return undefined if no ENS name', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const [noNameResult] = await ensCache.getNamesForAddresses([noENSNameAddr]);
    expect(noNameResult).toBe(undefined);
  });
});

describe('getAddressForName', () => {
  beforeAll(() => {
    ensCache.clearCache();
  });
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
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesResolveNameCalledBeforeSingleFetch = timesResolveNameCalled;
    const ashoatAddrResult1 = await ensCache.getAddressForName(ashoatDotEth);
    expect(ashoatAddrResult1).toBe(ashoatAddr);
    const timesResolveNameCalledForSingleFetch =
      timesResolveNameCalled - timesResolveNameCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesResolveNameCalledBeforeDoubleFetch = timesResolveNameCalled;
    const [ashoatAddrResult2, ashoatAddrResult3] = await Promise.all([
      ensCache.getAddressForName(ashoatDotEth),
      ensCache.getAddressForName(ashoatDotEth),
    ]);
    expect(ashoatAddrResult2).toBe(ashoatAddr);
    expect(ashoatAddrResult3).toBe(ashoatAddr);
    const timesResolveNamesCalledForDoubleFetch =
      timesResolveNameCalled - timesResolveNameCalledBeforeDoubleFetch;

    expect(timesResolveNamesCalledForDoubleFetch).toBe(
      timesResolveNameCalledForSingleFetch,
    );
  });
});

describe('getAvatarURIForAddress', () => {
  beforeAll(() => {
    ensCache.clearCache();
  });
  it("should fail to return ashoat.eth's avatar if not in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAvatarResult =
      ensCache.getCachedAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult).toBe(undefined);
  });
  it("should return ashoat.eth's avatar, an HTTP URI pointing to a PNG", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAvatarResult =
      await ensCache.getAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult).toBe(ashoatAvatar);
  });
  it("should return ashoat.eth's avatar if in cache", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const ashoatAvatarResult =
      ensCache.getCachedAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult).toBe(ashoatAvatar);
  });
  it("should have ashoat.eth's avatar cached", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const timesGetAvatarCalledBefore = timesGetAvatarCalled;
    const ashoatAvatarResult =
      await ensCache.getAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult).toBe(ashoatAvatar);
    expect(timesGetAvatarCalled).toBe(timesGetAvatarCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesGetAvatarCalledBeforeSingleFetch = timesGetAvatarCalled;
    const ashoatAvatarResult1 =
      await ensCache.getAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult1).toBe(ashoatAvatar);
    const timesGetAvatarCalledForSingleFetch =
      timesGetAvatarCalled - timesGetAvatarCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesGetAvatarCalledBeforeDoubleFetch = timesGetAvatarCalled;
    const [ashoatAvatarResult2, ashoatAvatarResult3] = await Promise.all([
      ensCache.getAvatarURIForAddress(ashoatAddr),
      ensCache.getAvatarURIForAddress(ashoatAddr),
    ]);
    expect(ashoatAvatarResult2).toBe(ashoatAvatar);
    expect(ashoatAvatarResult3).toBe(ashoatAvatar);
    const timesGetAvatarCalledForDoubleFetch =
      timesGetAvatarCalled - timesGetAvatarCalledBeforeDoubleFetch;

    expect(timesGetAvatarCalledForDoubleFetch).toBe(
      timesGetAvatarCalledForSingleFetch,
    );
  });
  it("should return commalpha.eth's avatar, an IPFS URI pointing to a JPEG", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const commalphaAvatarResult =
      await ensCache.getAvatarURIForAddress(commalphaEthAddr);
    expect(commalphaAvatarResult).toBe(commalphaEthAvatar);
  });
  it("should return commbeta.eth's avatar, an eip155:1/erc721 URI pointing to an NFT with an HTTP URL", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const commbetaAvatarResult =
      await ensCache.getAvatarURIForAddress(commbetaEthAddr);
    expect(commbetaAvatarResult).toBe(commbetaEthAvatar);
  });
});
