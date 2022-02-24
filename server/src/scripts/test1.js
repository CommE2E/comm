// @flow

import { dbQuery, SQL } from '../database/database';

async function createTable() {
  await dbQuery(SQL`
    CREATE TABLE IF NOT EXISTS test1 (
      name varchar(255) NOT NULL,
      data varchar(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `);
}

async function addNameIndex() {
  await dbQuery(SQL`
    INSERT INTO test1 (name,data) 
    VALUES ('hi', 'hello');
  `);
}

export { createTable, addNameIndex };
