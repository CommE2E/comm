// @flow

import { deviceTypes } from 'lib/types/device-types.js';

import { dbQuery, SQL } from '../database/database.js';

// This function is used for invalidating native sessions so that we can trigger
// a log-in on the next socket connection attempt. We initially introduced this
// during the rollout of the identity service, where we needed the user's
// password on the keyserver to populate the identity service. We only
// invalidate native sessions because web sessions don't cache the user's
// password, and we don't want any user-visible issues to result from this.
async function fetchNativeCookieIDsForUserIDs(
  userIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  const query = SQL`
    SELECT id
    FROM cookies
    WHERE platform IN (${deviceTypes}) AND user IN (${userIDs})
  `;
  const [result] = await dbQuery(query);
  return result.map(({ id }) => id.toString());
}

export { fetchNativeCookieIDsForUserIDs };
