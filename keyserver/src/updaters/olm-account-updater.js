// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { dbQuery, SQL } from '../database/database.js';

async function updateOlmAccount(
  account: OlmAccount,
  picklingKey: string,
  isPrimary: boolean,
): Promise<void> {
  const pickledAccount = account.pickle(picklingKey);
  await dbQuery(
    SQL`
      UPDATE keyserver_olm_accounts 
      SET pickled_olm_account = ${pickledAccount} 
      WHERE is_primary = ${isPrimary}
    `,
  );
}

export { updateOlmAccount };
