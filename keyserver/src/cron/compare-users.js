// @flow

import { deleteCookies } from '../deleters/cookie-deleters.js';
import { fetchNativeCookieIDsForUserIDs } from '../fetchers/cookie-fetchers.js';
import { fetchAllUserIDs } from '../fetchers/user-fetchers.js';

async function compareMySQLUsersToIdentityService(): Promise<void> {
  // eslint-disable-next-line no-unused-vars
  const allUserIDs = await fetchAllUserIDs();
  // next we need to query identity service for two things:
  // 1. users in identity that aren't here
  // 2. users here that aren't in identity
  const userMissingFromKeyserver = [];
  const userMissingFromIdentity = [];
  if (userMissingFromKeyserver.length > 0) {
    console.warn(
      "found users in identity service that aren't in MySQL! " +
        JSON.stringify(userMissingFromKeyserver),
    );
  }
  if (userMissingFromIdentity.length === 0) {
    return;
  }
  const cookieIDs = await fetchNativeCookieIDsForUserIDs(
    userMissingFromIdentity,
  );
  await deleteCookies(cookieIDs);
}

export { compareMySQLUsersToIdentityService };
