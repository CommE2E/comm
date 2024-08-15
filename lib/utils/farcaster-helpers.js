// @flow

import { FCCache } from './fc-cache.js';

export type BaseFCInfo = {
  +fid?: ?string,
  +farcasterUsername?: ?string,
  +pfpURL?: ?string,
  ...
};
export type GetFCNames = <T: ?BaseFCInfo>(
  users: $ReadOnlyArray<T>,
) => Promise<T[]>;
export type GetFCAvatarURLs = <T: ?BaseFCInfo>(
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
      cachedResult = fcCache.getCachedFarcasterUserForFID(fid)?.username;
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
    const results = await fcCache.getFarcasterUsersForFIDs(needFetch);
    for (let i = 0; i < needFetch.length; i++) {
      const fid = needFetch[i];
      const result = results[i];
      if (result) {
        farcasterUsernames.set(fid, result.username);
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

async function getFCAvatarURLs<T: ?BaseFCInfo>(
  fcCache: FCCache,
  users: $ReadOnlyArray<T>,
): Promise<T[]> {
  const info = users.map(user => {
    if (!user) {
      return user;
    }
    const { fid, pfpURL } = user;
    let cachedResult = null;
    if (pfpURL) {
      cachedResult = pfpURL;
    } else if (fid) {
      cachedResult = fcCache.getCachedFarcasterUserForFID(fid)?.pfpURL;
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

  const pfpURLs = new Map<string, string>();
  if (needFetch.length > 0) {
    const results = await fcCache.getFarcasterUsersForFIDs(needFetch);
    for (let i = 0; i < needFetch.length; i++) {
      const fid = needFetch[i];
      const result = results[i];
      if (result) {
        pfpURLs.set(fid, result.pfpURL);
      }
    }
  }

  return info.map(user => {
    if (!user) {
      return user;
    }
    const { input, fid, cachedResult } = user;
    if (cachedResult) {
      return { ...input, pfpURL: cachedResult };
    } else if (!fid) {
      return input;
    }
    const pfpURL = pfpURLs.get(fid);
    if (pfpURL) {
      return { ...input, pfpURL };
    }
    return input;
  });
}

export { getFCNames, getFCAvatarURLs };
