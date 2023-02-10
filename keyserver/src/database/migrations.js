// @flow

import type { QueryResults } from 'mysql';

import { isDev } from 'lib/utils/dev-utils.js';
import { getMessageForException } from 'lib/utils/errors.js';
import sleep from 'lib/utils/sleep.js';

import { dbQuery, SQL, setConnectionContext } from './database.js';
import { fetchDBVersion, updateDBVersion } from './db-version.js';
import { migrations } from './migration-config.js';
import { setupDB } from './setup-db.js';

async function migrate(): Promise<boolean> {
  if (isDev) {
    await sleep(5000);
  }

  let dbVersion = null;
  try {
    dbVersion = await setUpDBAndReturnVersion();
    console.log(`(node:${process.pid}) DB version: ${dbVersion}`);
  } catch (e) {
    const dbVersionExceptionMessage = String(getMessageForException(e));
    console.error(`(node:${process.pid}) ${dbVersionExceptionMessage}`);
    return false;
  }

  setConnectionContext({ migrationsActive: true });
  for (const [idx, migration] of migrations.entries()) {
    if (idx <= dbVersion) {
      continue;
    }

    try {
      await startTransaction();
      await migration();
      await updateDBVersion(idx);
      await commitTransaction();
      console.log(`(node:${process.pid}) migration ${idx} succeeded.`);
    } catch (e) {
      const transactionExceptionMessage = String(getMessageForException(e));
      console.error(`(node:${process.pid}) migration ${idx} failed.`);
      console.error(transactionExceptionMessage);
      await rollbackTransaction();
      return false;
    }
  }
  setConnectionContext({ migrationsActive: false });
  return true;
}

const MYSQL_TABLE_DOESNT_EXIST_ERROR_CODE = 1146;

async function setUpDBAndReturnVersion(): Promise<number> {
  try {
    return await fetchDBVersion();
  } catch (e) {
    if (e.errno !== MYSQL_TABLE_DOESNT_EXIST_ERROR_CODE) {
      throw e;
    }
    await setupDB();
    return await fetchDBVersion();
  }
}

async function startTransaction(): Promise<QueryResults> {
  const beginTxnQuery = SQL`
        START TRANSACTION;
      `;
  return dbQuery(beginTxnQuery);
}

async function commitTransaction(): Promise<QueryResults> {
  const endTxnQuery = SQL`
        COMMIT;
      `;
  return dbQuery(endTxnQuery);
}

async function rollbackTransaction(): Promise<QueryResults> {
  const rollbackTxnQuery = SQL`
        ROLLBACK;
      `;
  return dbQuery(rollbackTxnQuery);
}

export { migrate };
