// @flow

import { NeynarClient } from './neynar-client.js';
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
  +farcasterUsername: ?string | Promise<?string>,
};

class FCCache {
  client: NeynarClient;

  // Maps from FIDs to a cache entry for its Farcaster username
  farcasterUsernameQueryCache: Map<string, FarcasterUsernameQueryCacheEntry> =
    new Map();

  constructor(client: NeynarClient) {
    this.client = client;
  }

  getFarcasterUsernamesForFIDs(
    fids: $ReadOnlyArray<string>,
  ): Promise<Array<?string>> {
    const cacheMatches = fids.map(fid =>
      this.getCachedFarcasterUsernameEntryForFID(fid),
    );
    const cacheResultsPromise = Promise.all(
      cacheMatches.map(match =>
        Promise.resolve(match ? match.farcasterUsername : match),
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

    const fetchFarcasterUsernamesPromise = (async () => {
      let farcasterUsernames: $ReadOnlyArray<?string>;
      try {
        const farcasterUsers = await Promise.race([
          this.client.getFarcasterUsers(needFetch),
          throwOnTimeout(`usernames for ${JSON.stringify(needFetch)}`),
        ]);
        farcasterUsernames = farcasterUsers.map(
          farcasterUser => farcasterUser?.username,
        );
      } catch (e) {
        console.log(e);
        farcasterUsernames = new Array<?string>(needFetch.length).fill(null);
      }

      const resultMap = new Map<string, ?string>();
      for (let i = 0; i < needFetch.length; i++) {
        const fid = needFetch[i];
        const farcasterUsername = farcasterUsernames[i];
        resultMap.set(fid, farcasterUsername);
      }
      return resultMap;
    })();

    for (let i = 0; i < needFetch.length; i++) {
      const fid = needFetch[i];
      const fetchFarcasterUsernamePromise = (async () => {
        const resultMap = await fetchFarcasterUsernamesPromise;
        return resultMap.get(fid) ?? null;
      })();
      this.farcasterUsernameQueryCache.set(fid, {
        fid,
        expirationTime: Date.now() + queryTimeout * 2,
        farcasterUsername: fetchFarcasterUsernamePromise,
      });
    }

    return (async () => {
      const [resultMap, cacheResults] = await Promise.all([
        fetchFarcasterUsernamesPromise,
        cacheResultsPromise,
      ]);
      for (let i = 0; i < needFetch.length; i++) {
        const fid = needFetch[i];
        const farcasterUsername = resultMap.get(fid);
        const timeout =
          farcasterUsername === null ? failedQueryCacheTimeout : cacheTimeout;
        this.farcasterUsernameQueryCache.set(fid, {
          fid,
          expirationTime: Date.now() + timeout,
          farcasterUsername,
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

  getCachedFarcasterUsernameEntryForFID(
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

  getCachedFarcasterUsernameForFID(fid: string): ?string {
    const cacheResult = this.getCachedFarcasterUsernameEntryForFID(fid);
    if (!cacheResult) {
      return undefined;
    }

    const { farcasterUsername } = cacheResult;
    if (typeof farcasterUsername !== 'string') {
      return undefined;
    }

    return farcasterUsername;
  }
}

export { FCCache };
