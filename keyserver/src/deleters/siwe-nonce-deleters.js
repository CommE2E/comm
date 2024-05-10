// @flow

import { legacyKeyserverSIWENonceLifetime } from 'lib/types/siwe-types.js';

import { dbQuery, SQL } from '../database/database.js';

async function deleteStaleSIWENonceEntries(): Promise<void> {
  const earliestValidCreationTime =
    Date.now() - legacyKeyserverSIWENonceLifetime;
  const query = SQL`
    DELETE FROM siwe_nonces
    WHERE creation_time < ${earliestValidCreationTime}
  `;
  await dbQuery(query);
}

async function checkAndInvalidateSIWENonceEntry(
  nonce: string,
): Promise<boolean> {
  const earliestValidCreationTime =
    Date.now() - legacyKeyserverSIWENonceLifetime;
  const query = SQL`
    DELETE FROM siwe_nonces
    WHERE nonce = ${nonce} AND creation_time > ${earliestValidCreationTime}
  `;
  const [result] = await dbQuery(query);
  return result.affectedRows && result.affectedRows > 0;
}

export { deleteStaleSIWENonceEntries, checkAndInvalidateSIWENonceEntry };
