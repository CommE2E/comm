// @flow

import { NeynarClient, type FarcasterUser } from './neynar-client.js';
import sleep from './sleep.js';
import type { NeynarChannel } from '../types/farcaster-types.js';

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

type FarcasterChannelQueryCacheEntry = {
  +channelID: string,
  +expirationTime: number,
  +farcasterChannel: ?NeynarChannel | Promise<?NeynarChannel>,
};

type FollowedFarcasterChannelsQueryCacheEntry = {
  +fid: string,
  +expirationTime: number,
  +followedFarcasterChannels:
    | ?$ReadOnlyArray<NeynarChannel>
    | Promise<?$ReadOnlyArray<NeynarChannel>>,
};

type QueuedChannelQuery = {
  +channelID: string,
  +resolve: (?NeynarChannel) => void,
};

class FCCache {
  client: NeynarClient;

  // Maps from FIDs to a cache entry for its Farcaster user
  farcasterUsernameQueryCache: Map<string, FarcasterUsernameQueryCacheEntry> =
    new Map();

  // Maps from Farcaster channel IDs to a cache entry for the channel's info
  farcasterChannelQueryCache: Map<string, FarcasterChannelQueryCacheEntry> =
    new Map();

  // Maps from FIDs to a cache entry for the Farcaster user's followed channels
  followedFarcasterChannelsQueryCache: Map<
    string,
    FollowedFarcasterChannelsQueryCacheEntry,
  > = new Map();

  queuedChannelQueries: Array<QueuedChannelQuery> = [];

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
    if (
      typeof farcasterUser !== 'object' ||
      farcasterUser instanceof Promise ||
      !farcasterUser
    ) {
      return undefined;
    }

    return farcasterUser;
  }

  getFarcasterChannelForChannelID(channelID: string): Promise<?NeynarChannel> {
    const cachedChannelEntry =
      this.getCachedFarcasterChannelEntryForChannelID(channelID);

    if (cachedChannelEntry) {
      return Promise.resolve(cachedChannelEntry.farcasterChannel);
    }

    const fetchFarcasterChannelPromise = (async () => {
      let channelQuery;
      const promise = new Promise<?NeynarChannel>(resolve => {
        channelQuery = {
          channelID,
          resolve,
        };
        this.queuedChannelQueries.push(channelQuery);
      });

      // First, we finish any ongoing fetches of followed channels,
      // since our channel might be one of them
      const fidsInFollowedChannelQueryCache = [
        ...this.followedFarcasterChannelsQueryCache.keys(),
      ];
      const followedChannelQueryPromises = fidsInFollowedChannelQueryCache
        .map(fid => {
          const entry = this.getCachedFollowedFarcasterChannelsEntryForFID(fid);
          if (!entry) {
            return null;
          }
          const { followedFarcasterChannels } = entry;
          if (followedFarcasterChannels instanceof Promise) {
            return followedFarcasterChannels;
          }
          return null;
        })
        .filter(Boolean);
      if (followedChannelQueryPromises.length > 0) {
        const followedChannelQueryResults = await Promise.all(
          followedChannelQueryPromises,
        );
        for (const followedChannelQueryResult of followedChannelQueryResults) {
          if (!followedChannelQueryResult) {
            continue;
          }
          for (const channel of followedChannelQueryResult) {
            if (channel.id !== channelID) {
              continue;
            }
            this.queuedChannelQueries = this.queuedChannelQueries.filter(
              possibleChannelQuery => possibleChannelQuery !== channelQuery,
            );
            return channel;
          }
        }
      }

      if (this.queuedChannelQueries.length === 0) {
        return promise;
      }

      const channelQueries = this.queuedChannelQueries;
      this.queuedChannelQueries = [];

      const channelIDs = channelQueries.map(query => query.channelID);
      const bulkQueryPromise = (async () => {
        // If we only need to query for one, don't bother with the bulk API
        if (channelIDs.length === 1) {
          const [chanID] = channelIDs;

          let farcasterChannel;
          try {
            farcasterChannel = await Promise.race([
              this.client.fetchFarcasterChannelByID(chanID),
              throwOnTimeout(`channel for ${chanID}`),
            ]);
          } catch (e) {
            console.log(e);
            return null;
          }

          this.farcasterChannelQueryCache.set(chanID, {
            channelID: chanID,
            expirationTime: Date.now() + cacheTimeout,
            farcasterChannel,
          });

          return farcasterChannel ? [farcasterChannel] : [];
        }

        let farcasterChannels;
        try {
          farcasterChannels = await Promise.race([
            this.client.fetchFarcasterChannelsByIDs(channelIDs),
            throwOnTimeout(`channels for ${JSON.stringify(channelIDs)}`),
          ]);
        } catch (e) {
          console.log(e);
          return null;
        }

        const channelIDsInResultSet = new Set<string>();
        for (const farcasterChannel of farcasterChannels) {
          const chanID = farcasterChannel.id;
          channelIDsInResultSet.add(chanID);
          this.farcasterChannelQueryCache.set(chanID, {
            channelID: chanID,
            expirationTime: Date.now() + cacheTimeout,
            farcasterChannel,
          });
        }

        for (const chanID of channelIDs) {
          if (!channelIDsInResultSet.has(chanID)) {
            this.farcasterChannelQueryCache.set(chanID, {
              channelID: chanID,
              expirationTime: Date.now() + cacheTimeout,
              farcasterChannel: undefined,
            });
          }
        }

        return farcasterChannels;
      })();

      for (const query of channelQueries) {
        const { channelID: chanID, resolve } = query;
        void (async () => {
          const channels = await bulkQueryPromise;
          if (!channels) {
            resolve(null);
            return;
          }
          for (const channel of channels) {
            if (channel.id === chanID) {
              resolve(channel);
              return;
            }
          }
          resolve(undefined);
        })();
      }

      return promise;
    })();

    this.farcasterChannelQueryCache.set(channelID, {
      channelID,
      expirationTime: Date.now() + queryTimeout * 4,
      farcasterChannel: fetchFarcasterChannelPromise,
    });

    return fetchFarcasterChannelPromise;
  }

  getCachedFarcasterChannelEntryForChannelID(
    channelID: string,
  ): ?FarcasterChannelQueryCacheEntry {
    const cacheResult = this.farcasterChannelQueryCache.get(channelID);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.farcasterChannelQueryCache.delete(channelID);
      return undefined;
    }

    return cacheResult;
  }

  getCachedFarcasterChannelForChannelID(channelID: string): ?NeynarChannel {
    const cacheResult =
      this.getCachedFarcasterChannelEntryForChannelID(channelID);
    if (!cacheResult) {
      return undefined;
    }

    const { farcasterChannel } = cacheResult;
    if (
      typeof farcasterChannel !== 'object' ||
      farcasterChannel instanceof Promise ||
      !farcasterChannel
    ) {
      return undefined;
    }

    return farcasterChannel;
  }

  getFollowedFarcasterChannelsForFID(
    fid: string,
  ): Promise<?$ReadOnlyArray<NeynarChannel>> {
    const cachedChannelEntry =
      this.getCachedFollowedFarcasterChannelsEntryForFID(fid);

    if (cachedChannelEntry) {
      return Promise.resolve(cachedChannelEntry.followedFarcasterChannels);
    }

    const fetchFollowedFarcasterChannelsPromise = (async () => {
      let followedFarcasterChannels;
      try {
        followedFarcasterChannels = await Promise.race([
          this.client.fetchFollowedFarcasterChannels(fid),
          throwOnTimeout(`followed channels for ${fid}`),
        ]);
      } catch (e) {
        console.log(e);
        return null;
      }

      this.followedFarcasterChannelsQueryCache.set(fid, {
        fid,
        expirationTime: Date.now() + cacheTimeout,
        followedFarcasterChannels,
      });

      if (followedFarcasterChannels) {
        for (const channel of followedFarcasterChannels) {
          const channelID = channel.id;
          if (this.getCachedFarcasterChannelForChannelID(channelID)) {
            continue;
          }
          this.farcasterChannelQueryCache.set(channelID, {
            channelID,
            expirationTime: Date.now() + cacheTimeout,
            farcasterChannel: channel,
          });
        }
      }

      return followedFarcasterChannels;
    })();

    this.followedFarcasterChannelsQueryCache.set(fid, {
      fid,
      expirationTime: Date.now() + queryTimeout * 2,
      followedFarcasterChannels: fetchFollowedFarcasterChannelsPromise,
    });

    return fetchFollowedFarcasterChannelsPromise;
  }

  getCachedFollowedFarcasterChannelsEntryForFID(
    fid: string,
  ): ?FollowedFarcasterChannelsQueryCacheEntry {
    const cacheResult = this.followedFarcasterChannelsQueryCache.get(fid);
    if (!cacheResult) {
      return undefined;
    }

    const { expirationTime } = cacheResult;
    if (expirationTime <= Date.now()) {
      this.followedFarcasterChannelsQueryCache.delete(fid);
      return undefined;
    }

    return cacheResult;
  }

  getCachedFollowedFarcasterChannelsForFID(
    fid: string,
  ): ?$ReadOnlyArray<NeynarChannel> {
    const cacheResult = this.getCachedFollowedFarcasterChannelsEntryForFID(fid);
    if (!cacheResult) {
      return undefined;
    }

    const { followedFarcasterChannels } = cacheResult;
    if (
      typeof followedFarcasterChannels !== 'object' ||
      followedFarcasterChannels instanceof Promise ||
      !followedFarcasterChannels
    ) {
      return undefined;
    }

    return followedFarcasterChannels;
  }
}

export { FCCache };
