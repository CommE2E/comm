// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function addPrimaryColumn() {
  await dbQuery(SQL`
    ALTER TABLE cookies
    ADD \`primary\` TINYINT(1) DEFAULT NULL;
  `);
}

main([addPrimaryColumn]);
