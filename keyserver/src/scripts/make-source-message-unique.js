// @flow

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

async function makeSourceMessageUnique() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD UNIQUE (source_message)
  `);
}

main([makeSourceMessageUnique]);
