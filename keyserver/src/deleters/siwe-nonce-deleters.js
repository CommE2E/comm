// @flow

import { dbQuery, SQL } from '../database/database';

// 30 minutes = 30min * 60sec * 1000ms
export const nonceLifetime = 30 * 60 * 1000;

async function deleteStaleSIWENonceEntries(): Promise<void> {
  const earliestValidCreationTime = Date.now() - nonceLifetime;
  const query = SQL`
    DELETE FROM siwe_nonces
      WHERE creation_time < ${earliestValidCreationTime}
  `;
  await dbQuery(query);
}

export { deleteStaleSIWENonceEntries };
