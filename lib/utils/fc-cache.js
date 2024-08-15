// @flow

import { NeynarClient, type FarcasterUser } from './neynar-client.js';
import sleep from './sleep.js';

const cacheTimeout = 24 * 60 * 60 * 1000; // one day
const failedQueryCacheTimeout = 5 * 60 * 1000; // five minutes
const queryTimeout = 10 * 1000; // ten seconds

async function throwOnTimeout(identifier: string) {
  await sleep(queryTimeout);
  throw new Error(`Farcaster fetch for ${identifier} timed out`);
}

type FarcasterUsernameQueryCacheEntry = {
  +fid: string,
  +expirationTime: number,
  +farcasterUser: ?FarcasterUser | Promise<?FarcasterUser>,
};

class FCCache {
  client: NeynarClient;

  // Maps from FIDs to a cache entry for its Farcaster user
  farcasterUsernameQueryCache: Map<string, FarcasterUsernameQueryCacheEntry> =
    new Map();

  constructor(client: NeynarClient) {
    this.client = client;
  }

  getFarcasterUsersForFIDs(
    fids: $ReadOnlyArray<string>,
  ): Promise<Array<?FarcasterUser>> {
    const cacheMatches = fids.map(fid =>
      this.getCachedFarcasterUserEntryForFID(fid),
    );
    const cacheResultsPromise = Promise.all(
      cacheMatches.map(match =>
        Promise.resolve(match ? match.farcasterUser : match),
      ),
    );
    if (cacheMatches.every(Boolean)) {
      return cacheResultsPromise;
    }

    const needFetch = [];
    for (let i = 0; i < fids.length; i++) {
      const fid = fids[i];
      const cacheMatch = cacheMatches[i];
      if (!cacheMatch) {
        needFetch.push(fid);
      }
    }

    const fetchFarcasterUsersPromise = (async () => {
      let farcasterUsers: $ReadOnlyArray<?FarcasterUser>;
      try {
        farcasterUsers = await Promise.race([
          this.client.getFarcasterUsers(needFetch),
          throwOnTimeout(`users for ${JSON.stringify(needFetch)}`),
        ]);
      } catch (e) {
        console.log(e);
        farcasterUsers = new Array<?FarcasterUser>(needFetch.length).fill(null);
      }

      const resultMap = new Map<string, ?FarcasterUser>();
      for (let i = 0; i < needFetch.length; i++) {
        const fid = needFetch[i];
        const farcasterUser = farcasterUsers[i];
        resultMap.set(fid, farcasterUser);
      }
      return resultMap;
    })();

    for (let i = 0; i < needFetch.length; i++) {
      const fid = needFetch[i];
      const fetchFarcasterUserPromise = (async () => {
        const resultMap = await fetchFarcasterUsersPromise;
        return resultMap.get(fid) ?? null;
      })();
      this.farcasterUsernameQueryCache.set(fid, {
        fid,
        expirationTime: Date.now() + queryTimeout * 2,
        farcasterUser: fetchFarcasterUserPromise,
      });
    }

    return (async () => {
      const [resultMap, cacheResults] = await Promise.all([
        fetchFarcasterUsersPromise,
        cacheResultsPromise,
      ]);
      for (let i = 0; i < needFetch.length; i++) {
        const fid = needFetch[i];
        const farcasterUser = resultMap.get(fid);
        const timeout =
          farcasterUser === null ? failedQueryCacheTimeout : cacheTimeout;
        this.farcasterUsernameQueryCache.set(fid, {
          fid,
          expirationTime: Date.now() + timeout,
          farcasterUser,
        });
      }

      const results = [];
      for (let i = 0; i < fids.length; i++) {
        const cachedResult = cacheResults[i];
        if (cachedResult) {
          results.push(cachedResult);
        } else {
          results.push(resultMap.get(fids[i]));
        }
      }
      return results;
    })();
  }

  getCachedFarcasterUserEntryForFID(
    fid: string,
  ): ?FarcasterUsernameQueryCacheEntry {
    const cacheResult = this.farcasterUsernameQueryCache.get(fid);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.farcasterUsernameQueryCache.delete(fid);
      return undefined;
    }

    return cacheResult;
  }

  getCachedFarcasterUserForFID(fid: string): ?FarcasterUser {
    const cacheResult = this.getCachedFarcasterUserEntryForFID(fid);
    if (!cacheResult) {
      return undefined;
    }

    const { farcasterUser } = cacheResult;
    if (typeof farcasterUser !== 'object' || farcasterUser instanceof Promise) {
      return undefined;
    }

    return farcasterUser;
  }
}

export { FCCache };
