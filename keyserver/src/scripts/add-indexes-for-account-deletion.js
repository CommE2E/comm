// @flow

import { dbQuery, SQL } from '../database/database.js';
import { setScriptContext } from './script-context.js';
import { main } from './utils.js';

setScriptContext({
  allowMultiStatementSQLQueries: true,
});

async function addIndexes() {
  await dbQuery(SQL`
    ALTER TABLE memberships ADD INDEX user (user);
    ALTER TABLE notifications ADD INDEX user (user);
    ALTER TABLE relationships_directed ADD UNIQUE user2_user1 (user2, user1);
  `);
}

main([addIndexes]);
