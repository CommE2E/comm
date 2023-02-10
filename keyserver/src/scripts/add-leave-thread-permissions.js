// @flow

import { threadPermissions, threadTypes } from 'lib/types/thread-types.js';

import { endScript } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';
import { recalculateAllThreadPermissions } from '../updaters/thread-permission-updaters.js';

async function main() {
  try {
    await addLeaveThreadPermissions();
    await recalculateAllThreadPermissions();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function addLeaveThreadPermissions() {
  const leaveThreadString = `$.${threadPermissions.LEAVE_THREAD}`;
  const updateAllRoles = SQL` 
    UPDATE roles r 
    LEFT JOIN threads t ON t.id = r.thread
    SET r.permissions = JSON_SET(permissions, ${leaveThreadString}, TRUE) 
    WHERE t.type != ${threadTypes.PERSONAL}
  `;
  await dbQuery(updateAllRoles);
}

main();
