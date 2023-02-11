// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function createTable() {
  await dbQuery(SQL`
    CREATE TABLE IF NOT EXISTS metadata (
      name varchar(255) NOT NULL,
      data varchar(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `);
}

async function addNameIndex() {
  await dbQuery(SQL`
    ALTER TABLE metadata
      ADD PRIMARY KEY (name);
  `);
}

main([createTable, addNameIndex]);
