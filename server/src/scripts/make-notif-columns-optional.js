// @flow

import { dbQuery, SQL } from '../database/database';
import { endScript } from './utils';

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
