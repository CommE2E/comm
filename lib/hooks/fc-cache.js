// @flow

import * as React from 'react';

import { NeynarClientContext } from '../components/neynar-client-provider.react.js';
import { getFCNames } from '../utils/farcaster-helpers.js';

type BaseFCInfo = {
  +fid?: ?string,
  +farcasterUsername?: ?string,
  ...
};
export type UseFCNamesOptions = {
  +allAtOnce?: ?boolean,
};
function useFCNames<T: ?BaseFCInfo>(
  users: $ReadOnlyArray<T>,
  options?: ?UseFCNamesOptions,
): T[] {
  const neynarClientContext = React.useContext(NeynarClientContext);
  const fcCache = neynarClientContext?.fcCache;
  const allAtOnce = options?.allAtOnce ?? false;

  const cachedInfo = React.useMemo(
    () =>
      users.map(user => {
        if (!user) {
          return user;
        }
        const { fid, farcasterUsername } = user;
        let cachedResult = null;
        if (farcasterUsername) {
          cachedResult = farcasterUsername;
        } else if (fid && fcCache) {
          cachedResult = fcCache.getCachedFarcasterUserForFID(fid)?.username;
        }
        return {
          input: user,
          fid,
          cachedResult,
        };
      }),
    [users, fcCache],
  );

  const [fetchedFIDs, setFetchedFIDs] = React.useState<$ReadOnlySet<string>>(
    new Set(),
  );
  const [farcasterUsernames, setFarcasterUsernames] = React.useState<
    $ReadOnlyMap<string, string>,
  >(new Map());

  React.useEffect(() => {
    if (!fcCache) {
      return;
    }

    const needFetchUsers: $ReadOnlyArray<{
      +fid: string,
      +farcasterUsername?: ?string,
    }> = cachedInfo
      .map(user => {
        if (!user) {
          return null;
        }
        const { fid, cachedResult } = user;
        if (cachedResult || !fid || fetchedFIDs.has(fid)) {
          return null;
        }
        return { fid };
      })
      .filter(Boolean);
    if (needFetchUsers.length === 0) {
      return;
    }

    const needFetchFIDs = needFetchUsers.map(({ fid }) => fid);
    setFetchedFIDs(oldFetchedFIDs => {
      const newFetchedFIDs = new Set(oldFetchedFIDs);
      for (const fid of needFetchFIDs) {
        newFetchedFIDs.add(fid);
      }
      return newFetchedFIDs;
    });

    if (allAtOnce) {
      void (async () => {
        const withFarcasterUsernames = await getFCNames(
          fcCache,
          needFetchUsers,
        );
        setFarcasterUsernames(oldFarcasterUsernames => {
          const newFarcasterUsernames = new Map(oldFarcasterUsernames);
          for (let i = 0; i < withFarcasterUsernames.length; i++) {
            const fid = needFetchFIDs[i];
            const result = withFarcasterUsernames[i].farcasterUsername;
            if (result) {
              newFarcasterUsernames.set(fid, result);
            }
          }
          return newFarcasterUsernames;
        });
      })();
      return;
    }

    for (const fid of needFetchFIDs) {
      void (async () => {
        const [result] = await fcCache.getFarcasterUsersForFIDs([fid]);
        if (!result) {
          return;
        }
        setFarcasterUsernames(oldFarcasterUsernames => {
          const newFarcasterUsernames = new Map(oldFarcasterUsernames);
          newFarcasterUsernames.set(fid, result.username);
          return newFarcasterUsernames;
        });
      })();
    }
  }, [cachedInfo, fetchedFIDs, fcCache, allAtOnce]);

  return React.useMemo(
    () =>
      cachedInfo.map(user => {
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
      }),
    [cachedInfo, farcasterUsernames],
  );
}

function useFarcasterAvatar(fid: ?string): ?string {
  const neynarClientContext = React.useContext(NeynarClientContext);
  const { fcCache } = neynarClientContext || {};

  const cachedAvatar = React.useMemo(() => {
    if (!fid || !fcCache) {
      return null;
    }
    const cachedUser = fcCache.getCachedFarcasterUserForFID(fid);
    return cachedUser?.pfpURL ?? null;
  }, [fcCache, fid]);

  const [farcasterAvatar, setFarcasterAvatar] = React.useState<?string>(null);

  React.useEffect(() => {
    if (!fcCache || !fid || cachedAvatar) {
      return;
    }
    void (async () => {
      const [fetchedUser] = await fcCache.getFarcasterUsersForFIDs([fid]);
      const avatarURL = fetchedUser?.pfpURL;
      if (!avatarURL) {
        return;
      }
      setFarcasterAvatar(avatarURL);
    })();
  }, [fcCache, cachedAvatar, fid]);

  return React.useMemo(() => {
    if (!fid) {
      return null;
    } else if (cachedAvatar !== undefined) {
      return cachedAvatar;
    } else {
      return farcasterAvatar;
    }
  }, [fid, cachedAvatar, farcasterAvatar]);
}

export { useFCNames, useFarcasterAvatar };
