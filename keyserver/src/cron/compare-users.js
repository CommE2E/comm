// @flow
import { getRustAPI } from 'rust-node-addon';

import { deleteCookies } from '../deleters/cookie-deleters.js';
import { fetchNativeCookieIDsForUserIDs } from '../fetchers/cookie-fetchers.js';
import { fetchAllUserIDs } from '../fetchers/user-fetchers.js';

async function compareMySQLUsersToIdentityService(): Promise<void> {
  // eslint-disable-next-line no-unused-vars
  const allUserIDs = await fetchAllUserIDs();
  const rustAPI = await getRustAPI();
  const userComparisonResult = await rustAPI.compareUsers(allUserIDs);
  const { usersMissingFromKeyserver, usersMissingFromIdentity } =
    userComparisonResult;

  if (usersMissingFromKeyserver.length > 0) {
    console.warn(
      "found users in identity service that aren't in MySQL! " +
        JSON.stringify(usersMissingFromKeyserver),
    );
  }
  if (usersMissingFromIdentity.length === 0) {
    return;
  }
  const cookieIDs = await fetchNativeCookieIDsForUserIDs(
    usersMissingFromIdentity,
  );
  if (cookieIDs.length === 0) {
    return;
  }
  await deleteCookies(cookieIDs);
}

export { compareMySQLUsersToIdentityService };
