// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addPublicKeyColumn() {
  await dbQuery(SQL`
    ALTER TABLE users
    ADD public_key char(116) DEFAULT NULL,
    ADD UNIQUE INDEX public_key (public_key);
  `);
}

main([addPublicKeyColumn]);
