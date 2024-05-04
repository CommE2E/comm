// @flow

import { FCCache } from './fc-cache.js';

type BaseFCInfo = {
  +fid?: ?string,
  +farcasterUsername?: ?string,
  ...
};
export type GetFCNames = <T: ?BaseFCInfo>(
  users: $ReadOnlyArray<T>,
) => Promise<T[]>;

async function getFCNames<T: ?BaseFCInfo>(
  fcCache: FCCache,
  users: $ReadOnlyArray<T>,
): Promise<T[]> {
  const info = users.map(user => {
    if (!user) {
      return user;
    }
    const { fid, farcasterUsername } = user;
    let cachedResult = null;
    if (farcasterUsername) {
      cachedResult = farcasterUsername;
    } else if (fid) {
      cachedResult = fcCache.getCachedFarcasterUsernameForFID(fid);
    }
    return {
      input: user,
      fid,
      cachedResult,
    };
  });

  const needFetch = info
    .map(user => {
      if (!user) {
        return null;
      }
      const { fid, cachedResult } = user;
      if (cachedResult || !fid) {
        return null;
      }
      return fid;
    })
    .filter(Boolean);

  const farcasterUsernames = new Map<string, string>();
  if (needFetch.length > 0) {
    const results = await fcCache.getFarcasterUsernamesForFIDs(needFetch);
    for (let i = 0; i < needFetch.length; i++) {
      const fid = needFetch[i];
      const result = results[i];
      if (result) {
        farcasterUsernames.set(fid, result);
      }
    }
  }

  return info.map(user => {
    if (!user) {
      return user;
    }
    const { input, fid, cachedResult } = user;
    if (cachedResult) {
      return { ...input, farcasterUsername: cachedResult };
    } else if (!fid) {
      return input;
    }
    const farcasterUsername = farcasterUsernames.get(fid);
    if (farcasterUsername) {
      return { ...input, farcasterUsername };
    }
    return input;
  });
}

export { getFCNames };
