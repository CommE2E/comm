// @flow

import { setScriptContext } from './script-context.js';
import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

setScriptContext({
  allowMultiStatementSQLQueries: true,
});

async function deleteEmails() {
  await dbQuery(SQL`
    DROP TABLE verifications;
    ALTER TABLE users DROP email, DROP email_verified;
  `);
}

main([deleteEmails]);
