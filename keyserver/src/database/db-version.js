// @flow

import type { QueryResults } from 'mysql';

import { dbQuery, SQL } from './database.js';

const dbVersionMetadataKey = 'db_version';

async function fetchDBVersion(): Promise<number> {
  const versionQuery = SQL`
    SELECT data
    FROM metadata
    WHERE name = ${dbVersionMetadataKey};
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
    VALUES (${dbVersionMetadataKey}, ${dbVersion})
    ON DUPLICATE KEY
    UPDATE
      data = ${dbVersion};
  `;
  return dbQuery(updateQuery);
}

export { fetchDBVersion, updateDBVersion };
