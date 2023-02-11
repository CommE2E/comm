// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function addPublicKeyColumn() {
  await dbQuery(SQL`
    ALTER TABLE sessions
    ADD public_key char(116) DEFAULT NULL,
    ADD UNIQUE INDEX public_key (public_key);
  `);
}

main([addPublicKeyColumn]);
