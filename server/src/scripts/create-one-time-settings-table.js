// @flow

import { dbQuery, SQL } from '../database/database';
import { main, endScript } from './utils';

async function addOneTimeSettingsTable() {
  await dbQuery(SQL`
    CREATE TABLE IF NOT EXISTS settings (
      user bigint(20) NOT NULL,
      name varchar(255) NOT NULL,
      data mediumtext COLLATE utf8mb4_bin DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
  `);
}

async function addSettingsIndex() {
  try {
    await dbQuery(SQL`
      ALTER TABLE settings
        ADD PRIMARY KEY (user, name);
    `);
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

main([addOneTimeSettingsTable, addSettingsIndex]);
