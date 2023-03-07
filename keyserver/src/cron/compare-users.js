// @flow
import { getRustAPI } from 'rust-node-addon';

import { deleteCookies } from '../deleters/cookie-deleters.js';
import { fetchNativeCookieIDsForUserIDs } from '../fetchers/cookie-fetchers.js';
import { fetchAllUserIDs } from '../fetchers/user-fetchers.js';

async function compareMySQLUsersToIdentityService(): Promise<void> {
  const [allUserIDs, rustAPI] = await Promise.all([
    fetchAllUserIDs(),
    getRustAPI(),
  ]);
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

  // By deleting a cookie associated with a user's device, we trigger an
  // auto-log-in from that device, which lets us access the user's password. We
  // need the password in order to double-write user data to the identity
  // service. We only delete cookies associated with native devices because we
  // don't cache passwords on other platforms.
  await deleteCookies(cookieIDs);
}

export { compareMySQLUsersToIdentityService };
