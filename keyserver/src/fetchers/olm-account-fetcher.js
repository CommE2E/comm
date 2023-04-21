// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { dbQuery, SQL } from '../database/database.js';
import { unpicklePickledOlmAccount } from '../utils/olm-utils.js';

async function fetchKeyserverOlmAccount(
  isPrimary: boolean,
): Promise<{ account: OlmAccount, picklingKey: string }> {
  const olmAccountResult = await dbQuery(
    SQL`
      SELECT pickling_key, pickled_olm_account FROM keyserver_olm_accounts WHERE is_primary=${isPrimary};
    `,
  );

  const picklingKey = olmAccountResult[0][0].pickling_key;
  const pickledAccount = olmAccountResult[0][0].pickled_olm_account;

  const account = await unpicklePickledOlmAccount({
    picklingKey,
    pickledAccount,
  });

  return { account, picklingKey };
}

export { fetchKeyserverOlmAccount };
