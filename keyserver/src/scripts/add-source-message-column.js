// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function deleteUnreadColumn() {
  await dbQuery(SQL`
    ALTER TABLE threads
    ADD source_message BIGINT(20) NULL DEFAULT NULL AFTER color
  `);
}

main([deleteUnreadColumn]);
