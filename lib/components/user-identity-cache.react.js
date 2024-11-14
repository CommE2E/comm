// @flow

import invariant from 'invariant';
import * as React from 'react';

import { IdentityClientContext } from '../shared/identity-client-context.js';
import type {
  UserIdentitiesResponse,
  Identity,
} from '../types/identity-service-types.js';
import { identityServiceQueryTimeout } from '../utils/identity-service.js';
import sleep from '../utils/sleep.js';

const cacheTimeout = 24 * 60 * 60 * 1000; // one day
// If the query fails due to a timeout, we don't cache it
// This forces a retry on the next request
const failedQueryCacheTimeout = 0;

async function throwOnTimeout(identifier: string) {
  await sleep(identityServiceQueryTimeout);
  throw new Error(`User identity fetch for ${identifier} timed out`);
}

function getUserIdentitiesResponseFromResults(
  userIDs: $ReadOnlyArray<string>,
  results: $ReadOnlyArray<?UserIdentityResult>,
): UserIdentitiesResponse {
  const response: {
    identities: { [userID: string]: Identity },
    reservedUserIdentifiers: { [userID: string]: string },
  } = {
    identities: {},
    reservedUserIdentifiers: {},
  };
  for (let i = 0; i < userIDs.length; i++) {
    const userID = userIDs[i];
    const result = results[i];
    if (!result) {
      continue;
    } else if (result.type === 'registered') {
      response.identities[userID] = result.identity;
    } else if (result.type === 'reserved') {
      response.reservedUserIdentifiers[userID] = result.identifier;
    }
  }
  return response;
}

type UserIdentityCache = {
  +getUserIdentities: (
    userIDs: $ReadOnlyArray<string>,
  ) => Promise<UserIdentitiesResponse>,
  +getCachedUserIdentity: (userID: string) => ?UserIdentityResult,
  +invalidateCacheForUser: (userID: string) => void,
};

type UserIdentityResult =
  | { +type: 'registered', +identity: Identity }
  | { +type: 'reserved', +identifier: string };
type UserIdentityCacheEntry = {
  +userID: string,
  +expirationTime: number,
  +result: ?UserIdentityResult | Promise<?UserIdentityResult>,
};

const UserIdentityCacheContext: React.Context<?UserIdentityCache> =
  React.createContext<?UserIdentityCache>();

type Props = {
  +children: React.Node,
};
function UserIdentityCacheProvider(props: Props): React.Node {
  const userIdentityCacheRef = React.useRef<
    Map<string, UserIdentityCacheEntry>,
  >(new Map());

  const getCachedUserIdentityEntry = React.useCallback(
    (userID: string): ?UserIdentityCacheEntry => {
      const cache = userIdentityCacheRef.current;

      const cacheResult = cache.get(userID);
      if (!cacheResult) {
        return undefined;
      }

      const { expirationTime } = cacheResult;
      if (expirationTime <= Date.now()) {
        cache.delete(userID);
        return undefined;
      }

      return cacheResult;
    },
    [],
  );

  const getCachedUserIdentity = React.useCallback(
    (userID: string): ?UserIdentityResult => {
      const cacheResult = getCachedUserIdentityEntry(userID);
      if (!cacheResult) {
        return undefined;
      }

      const { result } = cacheResult;
      if (typeof result !== 'object' || result instanceof Promise || !result) {
        return undefined;
      }

      return result;
    },
    [getCachedUserIdentityEntry],
  );

  const client = React.useContext(IdentityClientContext);
  const identityClient = client?.identityClient;
  invariant(identityClient, 'Identity client should be set');
  const { findUserIdentities } = identityClient;

  const getUserIdentities = React.useCallback(
    async (
      userIDs: $ReadOnlyArray<string>,
    ): Promise<UserIdentitiesResponse> => {
      const cacheMatches = userIDs.map(getCachedUserIdentityEntry);
      const cacheResultsPromise = Promise.all(
        cacheMatches.map(match =>
          Promise.resolve(match ? match.result : match),
        ),
      );
      if (cacheMatches.every(Boolean)) {
        const results = await cacheResultsPromise;
        return getUserIdentitiesResponseFromResults(userIDs, results);
      }

      const needFetch = [];
      for (let i = 0; i < userIDs.length; i++) {
        const userID = userIDs[i];
        const cacheMatch = cacheMatches[i];
        if (!cacheMatch) {
          needFetch.push(userID);
        }
      }

      const fetchUserIdentitiesPromise = (async () => {
        const userIdentities = await Promise.race([
          findUserIdentities(needFetch),
          throwOnTimeout(`user identities for ${JSON.stringify(needFetch)}`),
        ]);

        const resultMap = new Map<string, ?UserIdentityResult>();
        for (let i = 0; i < needFetch.length; i++) {
          const userID = needFetch[i];
          if (!userIdentities) {
            resultMap.set(userID, undefined);
            continue;
          }
          const identityMatch = userIdentities.identities[userID];
          if (identityMatch) {
            resultMap.set(userID, {
              type: 'registered',
              identity: identityMatch,
            });
            continue;
          }
          const reservedIdentifierMatch =
            userIdentities.reservedUserIdentifiers[userID];
          if (reservedIdentifierMatch) {
            resultMap.set(userID, {
              type: 'reserved',
              identifier: reservedIdentifierMatch,
            });
            continue;
          }
          resultMap.set(userID, null);
        }
        return resultMap;
      })();

      const cache = userIdentityCacheRef.current;
      for (let i = 0; i < needFetch.length; i++) {
        const userID = needFetch[i];
        const fetchUserIdentityPromise = (async () => {
          const resultMap = await fetchUserIdentitiesPromise;
          return resultMap.get(userID) ?? null;
        })();
        cache.set(userID, {
          userID,
          expirationTime: Date.now() + identityServiceQueryTimeout * 2,
          result: fetchUserIdentityPromise,
        });
      }

      return (async () => {
        const [resultMap, cacheResults] = await Promise.all([
          fetchUserIdentitiesPromise,
          cacheResultsPromise,
        ]);
        for (let i = 0; i < needFetch.length; i++) {
          const userID = needFetch[i];
          const userIdentity = resultMap.get(userID);
          const timeout =
            userIdentity === null ? failedQueryCacheTimeout : cacheTimeout;
          cache.set(userID, {
            userID,
            expirationTime: Date.now() + timeout,
            result: userIdentity,
          });
        }

        const results = [];
        for (let i = 0; i < userIDs.length; i++) {
          const cachedResult = cacheResults[i];
          if (cachedResult) {
            results.push(cachedResult);
          } else {
            results.push(resultMap.get(userIDs[i]));
          }
        }
        return getUserIdentitiesResponseFromResults(userIDs, results);
      })();
    },
    [getCachedUserIdentityEntry, findUserIdentities],
  );

  const invalidateCacheForUser = React.useCallback((userID: string) => {
    const cache = userIdentityCacheRef.current;
    cache.delete(userID);
  }, []);

  const value = React.useMemo(
    () => ({
      getUserIdentities,
      getCachedUserIdentity,
      invalidateCacheForUser,
    }),
    [getUserIdentities, getCachedUserIdentity, invalidateCacheForUser],
  );

  return (
    <UserIdentityCacheContext.Provider value={value}>
      {props.children}
    </UserIdentityCacheContext.Provider>
  );
}

function useUserIdentityCache(): UserIdentityCache {
  const context = React.useContext(UserIdentityCacheContext);
  invariant(context, 'UserIdentityCacheContext not found');
  return context;
}

export { UserIdentityCacheProvider, useUserIdentityCache };
