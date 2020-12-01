// @flow

import { threadPermissions, threadTypes } from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { endScript } from './utils';
import { recalculateAllThreadPermissions } from '../updaters/thread-permission-updaters';

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
