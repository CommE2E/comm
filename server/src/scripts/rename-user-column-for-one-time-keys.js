// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function renameUserToSession() {
  await dbQuery(SQL`
    ALTER TABLE one_time_keys
    CHANGE COLUMN user session
    bigint(20) NOT NULL;
  `);
}

main([renameUserToSession]);
