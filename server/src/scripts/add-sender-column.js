// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addColumn() {
  const update = SQL`
    ALTER TABLE memberships
    ADD sender TINYINT(1) UNSIGNED NOT NULL DEFAULT 0
  `;
  await dbQuery(update);
}

main([addColumn]);
