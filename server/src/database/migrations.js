// @flow

import fs from 'fs';
import type { QueryResults } from 'mysql';

import { getMessageForException } from 'lib/utils/errors';

import { dbQuery, SQL } from './database';

async function makeSureBaseRoutePathExists(filePath: string): Promise<void> {
  const readFile = await fs.promises.open(filePath, 'r');
  const contents = await readFile.readFile('utf8');
  const json = JSON.parse(contents);
  await readFile.close();
  if (json.baseRoutePath) {
    return;
  }
  let baseRoutePath;
  if (json.baseDomain === 'http://localhost') {
    baseRoutePath = json.basePath;
  } else if (filePath.endsWith('commapp_url.json')) {
    baseRoutePath = '/commweb/';
  } else {
    baseRoutePath = '/';
  }
  const newJSON = { ...json, baseRoutePath };
  console.warn(`updating ${filePath} to ${JSON.stringify(newJSON)}`);
  const writeFile = await fs.promises.open(filePath, 'w');
  await writeFile.writeFile(JSON.stringify(newJSON, null, '  '), 'utf8');
  await writeFile.close();
}

const migrations: $ReadOnlyMap<number, () => Promise<void>> = new Map([
  [
    0,
    async () => {
      await makeSureBaseRoutePathExists('facts/commapp_url.json');
      await makeSureBaseRoutePathExists('facts/squadcal_url.json');
    },
  ],
  [
    1,
    async () => {
      try {
        await fs.promises.unlink('facts/url.json');
      } catch {}
    },
  ],
]);

async function migrate(): Promise<boolean> {
  let dbVersion = null;
  try {
    dbVersion = await getDBVersion();
    console.log(`(node:${process.pid}) DB version: ${dbVersion}`);
  } catch (e) {
    const dbVersionExceptionMessage = String(getMessageForException(e));
    console.error(`(node:${process.pid}) ${dbVersionExceptionMessage}`);
    return false;
  }

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
  return true;
}

async function getDBVersion(): Promise<number> {
  const versionQuery = SQL`
    SELECT data
    FROM metadata
    WHERE name = 'db_version';
  `;
  const [[versionResult]] = await dbQuery(versionQuery);
  if (!versionResult) {
    return -1;
  }
  return versionResult.data;
}

async function updateDBVersion(dbVersion: number): Promise<QueryResults> {
  const updateQuery = SQL`
    INSERT INTO metadata (name, data)
    VALUES ('db_version', ${dbVersion})
    ON DUPLICATE KEY
    UPDATE
      data = ${dbVersion};
  `;
  return dbQuery(updateQuery);
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
