// @flow

import type { QueryResults } from 'mysql';

import { dbQuery, SQL } from './database';

async function fetchDBVersion(): Promise<number> {
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

export { fetchDBVersion, updateDBVersion };
