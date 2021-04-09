// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function makeSourceMessageUnique() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD UNIQUE (source_message)
  `);
}

main([makeSourceMessageUnique]);
