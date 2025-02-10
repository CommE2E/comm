// @flow

import { ServerError } from 'lib/utils/errors.js';

import { SQL, dbQuery } from '../database/database.js';
import { type PickledOlmAccount } from '../utils/olm-objects.js';

async function fetchPickledOlmAccount(
  olmAccountType: 'content' | 'notifications',
): Promise<PickledOlmAccount> {
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

  return { pickledAccount, picklingKey };
}

export { fetchPickledOlmAccount };
