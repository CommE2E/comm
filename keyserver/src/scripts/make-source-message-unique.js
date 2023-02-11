// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function makeSourceMessageUnique() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD UNIQUE (source_message)
  `);
}

main([makeSourceMessageUnique]);
