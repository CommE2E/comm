// @flow

import { ethers } from 'ethers';

import { ENSCache } from './ens-cache.js';

const provider = new ethers.providers.AlchemyProvider(
  'goerli',
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

const commalphaEthAddr = '0x727ad7F5134C03e88087a8019b80388b22aaD24d';
const commalphaEthAvatar =
  'https://gateway.ipfs.io/ipfs/Qmb6CCsr5Hvv1DKr9Yt9ucbaK8Fz9MUP1kW9NTqAJhk7o8';

const commbetaEthAddr = '0x07124c3b6687e78aec8f13a2312cba72a0bed387';
const commbetaEthAvatar =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgc3R5bGU9ImJhY2tncm91bmQ6ZGFya3Zpb2xldCI+PHBhdGggZD0iTTY4LjQ0IDE0My40NEM2MS44OCAxNDMuNDQgNTYuMDQgMTQxLjg0IDUwLjkyIDEzOC42NEM0NS44IDEzNS4zNiA0MS43NiAxMzAuNjggMzguOCAxMjQuNkMzNS44NCAxMTguNTIgMzQuMzYgMTExLjIgMzQuMzYgMTAyLjY0QzM0LjM2IDk0LjE2IDM1Ljg0IDg2Ljg4IDM4LjggODAuOEM0MS44NCA3NC42NCA0NS45NiA2OS45NiA1MS4xNiA2Ni43NkM1Ni40NCA2My40OCA2Mi40OCA2MS44NCA2OS4yOCA2MS44NEM3NC40OCA2MS44NCA3OC44NCA2Mi44OCA4Mi4zNiA2NC45NkM4NS44OCA2Ni45NiA4OC43NiA2OS4xMiA5MSA3MS40NEw4NS4zNiA3Ny44QzgzLjQ0IDc1LjcyIDgxLjIgNzQgNzguNjQgNzIuNjRDNzYuMTYgNzEuMjggNzMuMDQgNzAuNiA2OS4yOCA3MC42QzY0LjQgNzAuNiA2MC4xMiA3MS45MiA1Ni40NCA3NC41NkM1Mi43NiA3Ny4xMiA0OS44OCA4MC43NiA0Ny44IDg1LjQ4QzQ1LjggOTAuMiA0NC44IDk1Ljg0IDQ0LjggMTAyLjRDNDQuOCAxMDkuMDQgNDUuNzYgMTE0Ljc2IDQ3LjY4IDExOS41NkM0OS42IDEyNC4zNiA1Mi4zNiAxMjguMDggNTUuOTYgMTMwLjcyQzU5LjU2IDEzMy4zNiA2My45MiAxMzQuNjggNjkuMDQgMTM0LjY4QzcxLjc2IDEzNC42OCA3NC4zNiAxMzQuMjggNzYuODQgMTMzLjQ4Qzc5LjMyIDEzMi42IDgxLjI4IDEzMS40NCA4Mi43MiAxMzBWMTA5LjQ4SDY3VjEwMS4ySDkxLjk2VjEzNC4zMkM4OS40OCAxMzYuODggODYuMiAxMzkuMDQgODIuMTIgMTQwLjhDNzguMTIgMTQyLjU2IDczLjU2IDE0My40NCA2OC40NCAxNDMuNDRaTTEzNS45NTMgMTQzLjQ0QzEzMC44MzMgMTQzLjQ0IDEyNi4wNzMgMTQyLjI0IDEyMS42NzMgMTM5Ljg0QzExNy4zNTMgMTM3LjQ0IDExMy44MzMgMTMzLjk2IDExMS4xMTMgMTI5LjRDMTA4LjQ3MyAxMjQuODQgMTA3LjE1MyAxMTkuMzYgMTA3LjE1MyAxMTIuOTZDMTA3LjE1MyAxMDYuNCAxMDguNDczIDEwMC44NCAxMTEuMTEzIDk2LjI4QzExMy44MzMgOTEuNzIgMTE3LjM1MyA4OC4yNCAxMjEuNjczIDg1Ljg0QzEyNi4wNzMgODMuNDQgMTMwLjgzMyA4Mi4yNCAxMzUuOTUzIDgyLjI0QzE0MS4wNzMgODIuMjQgMTQ1Ljc5MyA4My40NCAxNTAuMTEzIDg1Ljg0QzE1NC41MTMgODguMjQgMTU4LjAzMyA5MS43MiAxNjAuNjczIDk2LjI4QzE2My4zOTMgMTAwLjg0IDE2NC43NTMgMTA2LjQgMTY0Ljc1MyAxMTIuOTZDMTY0Ljc1MyAxMTkuMzYgMTYzLjM5MyAxMjQuODQgMTYwLjY3MyAxMjkuNEMxNTguMDMzIDEzMy45NiAxNTQuNTEzIDEzNy40NCAxNTAuMTEzIDEzOS44NEMxNDUuNzkzIDE0Mi4yNCAxNDEuMDczIDE0My40NCAxMzUuOTUzIDE0My40NFpNMTM1Ljk1MyAxMzUuMjhDMTM5LjcxMyAxMzUuMjggMTQyLjk5MyAxMzQuMzYgMTQ1Ljc5MyAxMzIuNTJDMTQ4LjU5MyAxMzAuNiAxNTAuNzUzIDEyNy45NiAxNTIuMjczIDEyNC42QzE1My43OTMgMTIxLjI0IDE1NC41NTMgMTE3LjM2IDE1NC41NTMgMTEyLjk2QzE1NC41NTMgMTA4LjQ4IDE1My43OTMgMTA0LjU2IDE1Mi4yNzMgMTAxLjJDMTUwLjc1MyA5Ny43NiAxNDguNTkzIDk1LjEyIDE0NS43OTMgOTMuMjhDMTQyLjk5MyA5MS4zNiAxMzkuNzEzIDkwLjQgMTM1Ljk1MyA5MC40QzEzMi4xOTMgOTAuNCAxMjguOTEzIDkxLjM2IDEyNi4xMTMgOTMuMjhDMTIzLjM5MyA5NS4xMiAxMjEuMjMzIDk3Ljc2IDExOS42MzMgMTAxLjJDMTE4LjExMyAxMDQuNTYgMTE3LjM1MyAxMDguNDggMTE3LjM1MyAxMTIuOTZDMTE3LjM1MyAxMTcuMzYgMTE4LjExMyAxMjEuMjQgMTE5LjYzMyAxMjQuNkMxMjEuMjMzIDEyNy45NiAxMjMuMzkzIDEzMC42IDEyNi4xMTMgMTMyLjUyQzEyOC45MTMgMTM0LjM2IDEzMi4xOTMgMTM1LjI4IDEzNS45NTMgMTM1LjI4Wk0xMjQuMzEzIDcxLjQ0QzEyMi4zOTMgNzEuNDQgMTIwLjc5MyA3MC44IDExOS41MTMgNjkuNTJDMTE4LjMxMyA2OC4xNiAxMTcuNzEzIDY2LjU2IDExNy43MTMgNjQuNzJDMTE3LjcxMyA2Mi44OCAxMTguMzEzIDYxLjMyIDExOS41MTMgNjAuMDRDMTIwLjc5MyA1OC42OCAxMjIuMzkzIDU4IDEyNC4zMTMgNThDMTI2LjIzMyA1OCAxMjcuNzkzIDU4LjY4IDEyOC45OTMgNjAuMDRDMTMwLjI3MyA2MS4zMiAxMzAuOTEzIDYyLjg4IDEzMC45MTMgNjQuNzJDMTMwLjkxMyA2Ni41NiAxMzAuMjczIDY4LjE2IDEyOC45OTMgNjkuNTJDMTI3Ljc5MyA3MC44IDEyNi4yMzMgNzEuNDQgMTI0LjMxMyA3MS40NFpNMTQ3LjU5MyA3MS40NEMxNDUuNjczIDcxLjQ0IDE0NC4wNzMgNzAuOCAxNDIuNzkzIDY5LjUyQzE0MS41OTMgNjguMTYgMTQwLjk5MyA2Ni41NiAxNDAuOTkzIDY0LjcyQzE0MC45OTMgNjIuODggMTQxLjU5MyA2MS4zMiAxNDIuNzkzIDYwLjA0QzE0NC4wNzMgNTguNjggMTQ1LjY3MyA1OCAxNDcuNTkzIDU4QzE0OS41MTMgNTggMTUxLjA3MyA1OC42OCAxNTIuMjczIDYwLjA0QzE1My41NTMgNjEuMzIgMTU0LjE5MyA2Mi44OCAxNTQuMTkzIDY0LjcyQzE1NC4xOTMgNjYuNTYgMTUzLjU1MyA2OC4xNiAxNTIuMjczIDY5LjUyQzE1MS4wNzMgNzAuOCAxNDkuNTEzIDcxLjQ0IDE0Ny41OTMgNzEuNDRaIiBmaWxsPSJibGFjayIgLz48dGV4dCB4PSIyMCIgeT0iMTgwIiBmaWxsPSJibGFjayI+VG9rZW4gIyAzNjI3PC90ZXh0Pjwvc3ZnPg==';

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
    const ashoatAvatarResult = await ensCache.getAvatarURIForAddress(
      ashoatAddr,
    );
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
    const ashoatAvatarResult = await ensCache.getAvatarURIForAddress(
      ashoatAddr,
    );
    expect(ashoatAvatarResult).toBe(ashoatAvatar);
    expect(timesGetAvatarCalled).toBe(timesGetAvatarCalledBefore);
  });
  it('should dedup simultaneous fetches', async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }

    ensCache.clearCache();
    const timesGetAvatarCalledBeforeSingleFetch = timesGetAvatarCalled;
    const ashoatAvatarResult1 = await ensCache.getAvatarURIForAddress(
      ashoatAddr,
    );
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
    const commalphaAvatarResult = await ensCache.getAvatarURIForAddress(
      commalphaEthAddr,
    );
    expect(commalphaAvatarResult).toBe(commalphaEthAvatar);
  });
  it("should return commbeta.eth's avatar, an eip155:1/erc721 URI pointing to an NFT with an SVG data URI", async () => {
    if (!process.env.ALCHEMY_API_KEY) {
      return;
    }
    const commbetaAvatarResult = await ensCache.getAvatarURIForAddress(
      commbetaEthAddr,
    );
    expect(commbetaAvatarResult).toBe(commbetaEthAvatar);
  });
});
