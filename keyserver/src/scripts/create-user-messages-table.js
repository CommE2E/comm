// @flow

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

async function createTable() {
  await dbQuery(SQL`
    CREATE TABLE IF NOT EXISTS user_messages (
      recipient bigint(20) NOT NULL,
      thread bigint(20) NOT NULL,
      message bigint(20) NOT NULL,
      time bigint(20) NOT NULL,
      data mediumtext COLLATE utf8mb4_bin DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
  `);
}

async function addIndices() {
  try {
    await dbQuery(SQL`
      ALTER TABLE user_messages
        ADD INDEX recipient_time (recipient, time),
        ADD INDEX recipient_thread_time (recipient, thread, time),
        ADD INDEX thread (thread),
        ADD PRIMARY KEY (recipient, message);
    `);
  } catch {}
}

main([createTable, addIndices]);
