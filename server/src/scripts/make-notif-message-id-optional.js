// @flow

import { dbQuery, SQL } from '../database/database';
import { endScript } from './utils';

async function main() {
  try {
    await makeNotifMessageIDOptional();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function makeNotifMessageIDOptional() {
  await dbQuery(
    SQL`ALTER TABLE notifications CHANGE message message BIGINT(20) NULL`,
  );
}

main();
