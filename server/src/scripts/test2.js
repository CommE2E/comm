// @flow

import { dbQuery, SQL } from '../database/database';

async function alterTable() {
  await dbQuery(SQL`
    INSERT INTO test1 (name,data) 
    VALUES ('good', 'bye');
  `);
}

export { alterTable };
