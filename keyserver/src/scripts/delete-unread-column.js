// @flow

import { dbQuery, SQL } from '../database/database';
import { endScript } from './utils';

async function deleteUnreadColumn() {
  try {
    await dbQuery(SQL`
      ALTER TABLE memberships
      DROP COLUMN unread
    `);
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

deleteUnreadColumn();
