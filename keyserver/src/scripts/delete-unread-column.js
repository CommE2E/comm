// @flow

import { endScript } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

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
