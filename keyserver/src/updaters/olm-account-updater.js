// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';

import {
  SQL,
  dbQuery,
  getMultipleStatementsConnection,
} from '../database/database.js';
import { unpickleOlmAccount } from '../utils/olm-utils.js';

async function fetchCallUpdateOlmAccount(
  olmAccountType: 'content' | 'notifications',
  callback: (account: OlmAccount) => Promise<mixed>,
): Promise<mixed> {
  const isContent = olmAccountType === 'content';
  const connection = await getMultipleStatementsConnection();
  await connection.query(
    SQL`
      START TRANSACTION
    `,
  );
  const [olmAccountResult] = await connection.query(
    SQL`
      SELECT pickling_key, pickled_olm_account 
      FROM olm_accounts 
      WHERE is_content = ${isContent}
      FOR UPDATE
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

  const account = await unpickleOlmAccount({
    picklingKey,
    pickledAccount,
  });
  const result = await callback(account);
  const updatedPickledAccount = account.pickle(picklingKey);

  await connection.query(
    SQL`
      UPDATE olm_accounts 
      SET pickled_olm_account = ${updatedPickledAccount} 
      WHERE is_content = ${isContent}
    `,
  );
  await connection.query(
    SQL`
      COMMIT
    `,
  );
  return result;
}

async function fetchOlmAccount(
  olmAccountType: 'content' | 'notifications',
): Promise<{
  account: OlmAccount,
  picklingKey: string,
}> {
  const isContent = olmAccountType === 'content';
  const [olmAccountResult] = await dbQuery(
    SQL`
      SELECT pickling_key, pickled_olm_account 
      FROM olm_accounts 
      WHERE is_content = ${isContent}
    `,
  );
  if (olmAccountResult.length === 0) {
    throw new ServerError('missing_olm_account');
  }
  const picklingKey = olmAccountResult[0].pickling_key;
  const pickledAccount = olmAccountResult[0].pickled_olm_account;

  const account = await unpickleOlmAccount({
    picklingKey,
    pickledAccount,
  });

  return { account, picklingKey };
}

export { fetchCallUpdateOlmAccount, fetchOlmAccount };
