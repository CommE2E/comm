// @flow

import { addEnsContracts } from '@ensdomains/ensjs';
import { AlchemyProvider } from 'ethers';
import { createClient } from 'viem';
// eslint-disable-next-line import/extensions
import { mainnet, sepolia } from 'viem/chains';

import { ENSCache } from './ens-cache.js';
import { ENSWrapper } from './ens-wrapper.js';
import {
  getAlchemyMainnetViemTransport,
  getAlchemySepoliaViemTransport,
} from './viem-utils.js';

const sepoliaEthersProvider = new AlchemyProvider(
  'sepolia',
  process.env.ALCHEMY_API_KEY,
);

const sepoliaViemTransport = getAlchemySepoliaViemTransport(
  process.env.ALCHEMY_API_KEY,
);
const sepoliaViemClient = createClient({
  chain: addEnsContracts(sepolia),
  transport: sepoliaViemTransport,
});

const baseSepoliaENSWrapper = new ENSWrapper(
  sepoliaViemClient,
  sepoliaEthersProvider,
);

let timesGetAddressForNameCalled = 0;
let timesGetNameForAddressCalled = 0;
let timesGetAvatarURIForNameCalled = 0;
const sepoliaENSWrapper: ENSWrapper = ({
  ...baseSepoliaENSWrapper,
  getAddressForName: (ethAddress: string) => {
    timesGetAddressForNameCalled++;
    return baseSepoliaENSWrapper.getAddressForName(ethAddress);
  },
  getNameForAddress: (ensName: string) => {
    timesGetNameForAddressCalled++;
    return baseSepoliaENSWrapper.getNameForAddress(ensName);
  },
  getAvatarURIForName: (ensName: string) => {
    timesGetAvatarURIForNameCalled++;
    return baseSepoliaENSWrapper.getAvatarURIForName(ensName);
  },
}: any);
const ensCache = new ENSCache(sepoliaENSWrapper);

const mainnetEthersProvider = new AlchemyProvider(
  'mainnet',
  process.env.ALCHEMY_API_KEY,
);

const mainnetViemTransport = getAlchemyMainnetViemTransport(
  process.env.ALCHEMY_API_KEY,
);
const mainnetViemClient = createClient({
  chain: addEnsContracts(mainnet),
  transport: mainnetViemTransport,
});

const mainnetENSWrapper = new ENSWrapper(
  mainnetViemClient,
  mainnetEthersProvider,
);
const mainnetENSCache = new ENSCache(mainnetENSWrapper);

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

const nfthreatBaseName = 'nfthreat.base.eth';
const nfthreatBaseAddr = '0x598C91d70e16177defB34CbA95C2f80F551A4ccB';

describe('getNameForAddress', () => {
  beforeAll(() => {
    ensCache.clearCache();
    mainnetENSCache.clearCache();
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
  it('should return nfthreat.base.eth', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const nfthreatBaseResult =
      await mainnetENSCache.getNameForAddress(nfthreatBaseAddr);
    expect(nfthreatBaseResult).toBe(nfthreatBaseName);
  }, 10000);
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
    const timesLookupAddressCalledBefore = timesGetAddressForNameCalled;
    const ashoatEthResult = await ensCache.getNameForAddress(
      ashoatAddr.toUpperCase(),
    );
    expect(ashoatEthResult).toBe(ashoatDotEth);
    expect(timesGetAddressForNameCalled).toBe(timesLookupAddressCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesLookupAddressCalledBeforeSingleFetch =
      timesGetAddressForNameCalled;
    const ashoatEthResult1 = await ensCache.getNameForAddress(ashoatAddr);
    expect(ashoatEthResult1).toBe(ashoatDotEth);
    const timesLookupAddressCalledForSingleFetch =
      timesGetAddressForNameCalled - timesLookupAddressCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesLookupAddressCalledBeforeDoubleFetch =
      timesGetAddressForNameCalled;
    const [ashoatEthResult2, ashoatEthResult3] = await Promise.all([
      ensCache.getNameForAddress(ashoatAddr),
      ensCache.getNameForAddress(ashoatAddr.toUpperCase()),
    ]);
    expect(ashoatEthResult2).toBe(ashoatDotEth);
    expect(ashoatEthResult3).toBe(ashoatDotEth);
    const timesLookupAddressCalledForDoubleFetch =
      timesGetAddressForNameCalled - timesLookupAddressCalledBeforeDoubleFetch;

    expect(timesLookupAddressCalledForDoubleFetch).toBe(
      timesLookupAddressCalledForSingleFetch,
    );
  });
});

describe('getNamesForAddresses', () => {
  beforeAll(() => {
    ensCache.clearCache();
    mainnetENSCache.clearCache();
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
  it('should return nfthreat.base.eth', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const [nfthreatBaseResult] = await mainnetENSCache.getNamesForAddresses([
      nfthreatBaseAddr,
    ]);
    expect(nfthreatBaseResult).toBe(nfthreatBaseName);
  }, 10000);
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
    const timesLookupAddressCalledBefore = timesGetAddressForNameCalled;

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

    const timesLookupAddressCalledAfter = timesGetAddressForNameCalled;
    const timesLookupAddressCalledDuringTest =
      timesLookupAddressCalledAfter - timesLookupAddressCalledBefore;

    expect(timesLookupAddressCalledDuringTest).toBe(0);

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
    mainnetENSCache.clearCache();
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
    const timesResolveNameCalledBefore = timesGetNameForAddressCalled;
    const ashoatAddrResult = await ensCache.getAddressForName(ashoatDotEth);
    expect(ashoatAddrResult).toBe(ashoatAddr);
    expect(timesGetNameForAddressCalled).toBe(timesResolveNameCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesResolveNameCalledBeforeSingleFetch =
      timesGetNameForAddressCalled;
    const ashoatAddrResult1 = await ensCache.getAddressForName(ashoatDotEth);
    expect(ashoatAddrResult1).toBe(ashoatAddr);
    const timesResolveNameCalledForSingleFetch =
      timesGetNameForAddressCalled - timesResolveNameCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesResolveNameCalledBeforeDoubleFetch =
      timesGetNameForAddressCalled;
    const [ashoatAddrResult2, ashoatAddrResult3] = await Promise.all([
      ensCache.getAddressForName(ashoatDotEth),
      ensCache.getAddressForName(ashoatDotEth),
    ]);
    expect(ashoatAddrResult2).toBe(ashoatAddr);
    expect(ashoatAddrResult3).toBe(ashoatAddr);
    const timesResolveNamesCalledForDoubleFetch =
      timesGetNameForAddressCalled - timesResolveNameCalledBeforeDoubleFetch;

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
    const timesGetAvatarCalledBefore = timesGetAvatarURIForNameCalled;
    const ashoatAvatarResult =
      await ensCache.getAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult).toBe(ashoatAvatar);
    expect(timesGetAvatarURIForNameCalled).toBe(timesGetAvatarCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesGetAvatarCalledBeforeSingleFetch =
      timesGetAvatarURIForNameCalled;
    const ashoatAvatarResult1 =
      await ensCache.getAvatarURIForAddress(ashoatAddr);
    expect(ashoatAvatarResult1).toBe(ashoatAvatar);
    const timesGetAvatarCalledForSingleFetch =
      timesGetAvatarURIForNameCalled - timesGetAvatarCalledBeforeSingleFetch;

    ensCache.clearCache();
    const timesGetAvatarCalledBeforeDoubleFetch =
      timesGetAvatarURIForNameCalled;
    const [ashoatAvatarResult2, ashoatAvatarResult3] = await Promise.all([
      ensCache.getAvatarURIForAddress(ashoatAddr),
      ensCache.getAvatarURIForAddress(ashoatAddr),
    ]);
    expect(ashoatAvatarResult2).toBe(ashoatAvatar);
    expect(ashoatAvatarResult3).toBe(ashoatAvatar);
    const timesGetAvatarCalledForDoubleFetch =
      timesGetAvatarURIForNameCalled - timesGetAvatarCalledBeforeDoubleFetch;

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
