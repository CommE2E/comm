// @flow

import type { Account as OlmAccount } from '@commapp/olm';

import { ServerError } from 'lib/utils/errors.js';
import sleep from 'lib/utils/sleep.js';

import { SQL, dbQuery } from '../database/database.js';
import { unpickleAccountAndUseCallback } from '../utils/olm-objects.js';
import { unpickleOlmAccount } from '../utils/olm-utils.js';

const maxOlmAccountUpdateRetriesCount = 5;
const olmAccountUpdateRetryDelay = 200;

async function fetchCallUpdateOlmAccount<T>(
  olmAccountType: 'content' | 'notifications',
  callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
): Promise<T> {
  const isContent = olmAccountType === 'content';
  let retriesLeft = maxOlmAccountUpdateRetriesCount;

  while (retriesLeft > 0) {
    const [olmAccountResult] = await dbQuery(
      SQL`
        SELECT version, pickling_key, pickled_olm_account
        FROM olm_accounts 
        WHERE is_content = ${isContent}
      `,
    );

    if (olmAccountResult.length === 0) {
      throw new ServerError('missing_olm_account');
    }

    const [
      {
        version,
        pickling_key: picklingKey,
        pickled_olm_account: pickledAccount,
      },
    ] = olmAccountResult;

    const {
      result,
      pickledOlmAccount: { pickledAccount: updatedAccount },
    } = await unpickleAccountAndUseCallback(
      {
        picklingKey,
        pickledAccount,
      },
      callback,
    );

    const [transactionResult] = await dbQuery(
      SQL`
        START TRANSACTION;

        SELECT version INTO @currentVersion
        FROM olm_accounts 
        WHERE is_content = ${isContent} 
        FOR UPDATE;

        UPDATE olm_accounts
        SET 
          pickled_olm_account = ${updatedAccount}, 
          version = ${version} + 1
        WHERE version = ${version} AND is_content = ${isContent};
        
        COMMIT;

        SELECT @currentVersion AS versionOnUpdateAttempt;
      `,
      { multipleStatements: true },
    );
    const selectResult = transactionResult.pop();
    const [{ versionOnUpdateAttempt }] = selectResult;

    if (version === versionOnUpdateAttempt) {
      return result;
    }

    retriesLeft = retriesLeft - 1;
    await sleep(olmAccountUpdateRetryDelay);
  }

  throw new ServerError('max_olm_account_update_retry_exceeded');
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
