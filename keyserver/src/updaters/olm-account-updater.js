// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import { SQL, getMultipleStatementsConnection } from '../database/database.js';
import { unpicklePickledOlmAccount } from '../utils/olm-utils.js';

async function fetchCallUpdateOlmAccount(
  olmAccountType: 'primary' | 'notifications',
  callback: (account: OlmAccount) => Promise<void>,
): Promise<void> {
  const isPrimary = olmAccountType === 'primary';
  const connection = await getMultipleStatementsConnection();
  await connection.query(
    SQL`
      START TRANSACTION
    `,
  );
  const [olmAccountResult] = await connection.query(
    SQL`
      SELECT pickling_key, pickled_olm_account 
      FROM keyserver_olm_accounts 
      WHERE is_primary = ${isPrimary}
    `,
  );

  if (olmAccountResult.length === 0) {
    await connection.query(
      SQL`
        ROLLBACK
      `,
    );
    throw new ServerError('missing_olm_account');
  }

  const picklingKey = olmAccountResult[0].pickling_key;
  const pickledAccount = olmAccountResult[0].pickled_olm_account;
  const account = await unpicklePickledOlmAccount({
    picklingKey,
    pickledAccount,
  });
  await callback(account);
  const updatedPickledAccount = account.pickle(picklingKey);

  await connection.query(
    SQL`
      UPDATE keyserver_olm_accounts 
      SET pickled_olm_account = ${updatedPickledAccount} 
      WHERE is_primary = ${isPrimary}
    `,
  );
  await connection.query(
    SQL`
      COMMIT
    `,
  );
}

export { fetchCallUpdateOlmAccount };
