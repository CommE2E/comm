// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addColumn() {
  const update = SQL`
    ALTER TABLE threads
    ADD replies_count INT UNSIGNED NOT NULL DEFAULT 0
  `;
  await dbQuery(update);
}

main([addColumn]);
