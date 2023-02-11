// @flow

import { setScriptContext } from './script-context.js';
import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

setScriptContext({
  allowMultiStatementSQLQueries: true,
});

async function addIndexes() {
  await dbQuery(SQL`
    ALTER TABLE updates ADD INDEX target_time (target, time);
    ALTER TABLE updates DROP INDEX user_key_type;
    ALTER TABLE updates
      ADD INDEX user_key_target_type_time (user, \`key\`, target, type, time);
    ALTER TABLE updates
      ADD INDEX user_key_type_time (user, \`key\`, type, time);
    ALTER TABLE updates ADD INDEX user_key_time (user, \`key\`, time);
  `);
}

main([addIndexes]);
