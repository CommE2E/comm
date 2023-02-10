// @flow

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

async function addPrimaryColumn() {
  await dbQuery(SQL`
    ALTER TABLE cookies
    ADD \`primary\` TINYINT(1) DEFAULT NULL;
  `);
}

main([addPrimaryColumn]);
