// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { createPickledOlmSession } from '../utils/olm-utils.js';

async function createOlmSession(
  initialEncryptedMessage: string,
  olmSessionType: 'primary' | 'notifications',
  cookieID: string,
): Promise<void> {
  const isPrimary = olmSessionType === 'primary';

  let account;
  const accountCallback = async (callbackAccount: OlmAccount) => {
    account = callbackAccount;
  };
  await fetchCallUpdateOlmAccount(olmSessionType, accountCallback);
  if (!account) {
    throw new ServerError('missing_olm_account');
  }

  const [picklingKeyResult] = await dbQuery(
    SQL`
      SELECT pickling_key
      FROM keyserver_olm_accounts 
      WHERE is_primary = ${isPrimary}
    `,
  );
  if (picklingKeyResult.length === 0) {
    throw new ServerError('missing_account_pickling_key');
  }
  const picklingKey = picklingKeyResult[0].pickling_key;

  const pickledOlmSession = await createPickledOlmSession(
    account,
    picklingKey,
    initialEncryptedMessage,
  );

  // We match the native client behavior here where olm session is overwritten
  // in case it is initialized twice for the same pair of identities
  await dbQuery(
    SQL`
      INSERT INTO olm_sessions (cookie_id, is_primary, pickled_olm_session)
      VALUES (${cookieID}, ${isPrimary}, ${pickledOlmSession})
      ON DUPLICATE KEY UPDATE
        pickled_olm_session = ${pickledOlmSession}
    `,
  );
}

export { createOlmSession };
