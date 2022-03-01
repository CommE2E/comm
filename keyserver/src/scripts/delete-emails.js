// @flow

import { dbQuery, SQL } from '../database/database';
import { setScriptContext } from './script-context';
import { main } from './utils';

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
