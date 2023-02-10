// @flow

import { endScript } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function main() {
  try {
    await makeNotifColumnsOptional();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function makeNotifColumnsOptional() {
  await dbQuery(SQL`
    ALTER TABLE notifications
    CHANGE thread thread BIGINT(20) NULL DEFAULT NULL,
    CHANGE message message BIGINT(20) NULL DEFAULT NULL
  `);
}

main();
