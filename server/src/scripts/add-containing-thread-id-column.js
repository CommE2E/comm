// @flow

import { dbQuery, SQL } from '../database/database';
import { main } from './utils';

async function addColumnAndIndexes() {
  await dbQuery(SQL`
    ALTER TABLE threads
      ADD containing_thread_id BIGINT(20) NULL AFTER parent_thread_id,
      ADD INDEX parent_thread_id (parent_thread_id),
      ADD INDEX containing_thread_id (containing_thread_id);
  `);
}

main([addColumnAndIndexes]);
