// @flow

import { dbQuery, SQL } from '../database/database.js';
import { endScript } from './utils.js';

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
