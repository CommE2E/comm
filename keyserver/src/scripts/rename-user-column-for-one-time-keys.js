// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function renameUserToSession() {
  await dbQuery(SQL`
    ALTER TABLE one_time_keys
    CHANGE COLUMN user session
    bigint(20) NOT NULL;
  `);
}

main([renameUserToSession]);
