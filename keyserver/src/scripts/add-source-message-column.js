// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function deleteUnreadColumn() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD source_message BIGINT(20) NULL DEFAULT NULL AFTER color
  `);
}

main([deleteUnreadColumn]);
