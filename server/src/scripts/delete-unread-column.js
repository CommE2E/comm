import { endScript } from './utils';
import { dbQuery, SQL } from '../database/database';

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
