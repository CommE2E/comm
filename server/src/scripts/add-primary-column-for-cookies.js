// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addPrimaryColumn() {
  await dbQuery(SQL`
    ALTER TABLE cookies
    ADD \`primary\` TINYINT(1) DEFAULT NULL;
  `);
}

main([addPrimaryColumn]);
