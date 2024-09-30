// @flow

import { useUserIdentityCache } from '../components/user-identity-cache.react.js';
import type { UserIdentitiesResponse } from '../types/identity-service-types.js';

const findUserIdentitiesActionTypes = Object.freeze({
  started: 'FIND_USER_IDENTITIES_STARTED',
  success: 'FIND_USER_IDENTITIES_SUCCESS',
  failed: 'FIND_USER_IDENTITIES_FAILED',
});

function useFindUserIdentities(): (
  userIDs: $ReadOnlyArray<string>,
) => Promise<UserIdentitiesResponse> {
  const userIdentityCache = useUserIdentityCache();
  return userIdentityCache.getUserIdentities;
}

export { findUserIdentitiesActionTypes, useFindUserIdentities };
