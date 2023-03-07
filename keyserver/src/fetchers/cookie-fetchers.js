// @flow

import { dbQuery, SQL } from '../database/database.js';

// This function is used for invalidating native sessions so that we can trigger
// a log-in on the next socket connection attempt. We initially introduced this
// during the rollout of the identity service, where we needed the user's
// password on the keyserver to populate the identity service. We only
// invalidate native sessions because web sessions don't cache the user's
// password, and we don't want any user-visible issues to result from this.
async function fetchCookieIDsToInvalidateToPopulateIdentityService(
  userIDs: $ReadOnlyArray<string>,
): Promise<string[]> {
  // Native clients before codeVersion 193 don't provide the info necessary to
  // call the identity service, so there's no point to invalidating their
  // sessions. On Android, builds 193/194 have a bug that breaks log-in, so we
  // don't want to invalidate their sessions.
  const query = SQL`
    SELECT id
    FROM cookies
    WHERE user IN (${userIDs}) AND (
      (platform = 'ios' AND JSON_EXTRACT(versions, '$.codeVersion') > 192) OR
      (platform = 'android' AND JSON_EXTRACT(versions, '$.codeVersion') > 194)
    )
  `;
  const [result] = await dbQuery(query);
  return result.map(({ id }) => id.toString());
}

export { fetchCookieIDsToInvalidateToPopulateIdentityService };
