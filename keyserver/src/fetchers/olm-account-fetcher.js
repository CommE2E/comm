// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { unpicklePickledOlmAccount } from '../utils/olm-utils.js';

async function fetchKeyserverOlmAccount(
  olmAccountType: 'primary' | 'notifications',
): Promise<{ account: OlmAccount, picklingKey: string }> {
  const isPrimary = olmAccountType === 'primary';
  const [olmAccountResult] = await dbQuery(
    SQL`
      SELECT pickling_key, pickled_olm_account 
      FROM keyserver_olm_accounts 
      WHERE is_primary = ${isPrimary}
    `,
  );

  if (olmAccountResult.length === 0) {
    throw new ServerError(
      'olm_accounts was not correctly populated during migrations',
    );
  }

  const picklingKey = olmAccountResult[0].pickling_key;
  const pickledAccount = olmAccountResult[0].pickled_olm_account;

  const account = await unpicklePickledOlmAccount({
    picklingKey,
    pickledAccount,
  });

  return { account, picklingKey };
}

export { fetchKeyserverOlmAccount };
