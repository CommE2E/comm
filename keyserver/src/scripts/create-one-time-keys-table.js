// @flow

import { dbQuery, SQL } from '../database/database.js';
import { main, endScript } from './utils.js';

async function addOneTimeKeysTable() {
  await dbQuery(SQL`
    CREATE TABLE IF NOT EXISTS one_time_keys (
      user BIGINT(20) NOT NULL,
      one_time_key CHAR(43) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `);
}

async function addUserIndex() {
  try {
    await dbQuery(SQL`
      ALTER TABLE one_time_keys
        ADD PRIMARY KEY (user, one_time_key);
    `);
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

main([addOneTimeKeysTable, addUserIndex]);
