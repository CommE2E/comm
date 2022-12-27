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

async function checkAndInvalidateSIWENonceEntry(
  nonce: string,
): Promise<boolean> {
  const earliestValidCreationTime = Date.now() - nonceLifetime;
  const query = SQL`
    DELETE FROM siwe_nonces
    WHERE nonce = ${nonce} AND creation_time > ${earliestValidCreationTime}
  `;
  const [result] = await dbQuery(query);
  return result.affectedRows && result.affectedRows > 0;
}

export { deleteStaleSIWENonceEntries, checkAndInvalidateSIWENonceEntry };
