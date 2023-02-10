// @flow

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

async function deleteUnreadColumn() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD source_message BIGINT(20) NULL DEFAULT NULL AFTER color
  `);
}

main([deleteUnreadColumn]);
