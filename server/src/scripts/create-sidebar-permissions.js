// @flow

import {
  threadPermissions,
  threadPermissionPrefixes,
  assertThreadType,
} from 'lib/types/thread-types';

import bots from 'lib/facts/bots';

import { dbQuery, SQL } from '../database/database';
import { endScript } from './utils';
import { createScriptViewer } from '../session/scripts';
import {
  recalculateAllPermissions,
  commitMembershipChangeset,
} from '../updaters/thread-permission-updaters';

async function main() {
  try {
    await createSidebarPermissions();
    await updateAllThreadPermissions();
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

async function createSidebarPermissions() {
  const createSidebarsString = `$.${threadPermissions.CREATE_SIDEBARS}`;
  const updateAllRoles = SQL`
    UPDATE roles
    SET permissions = JSON_SET(permissions, ${createSidebarsString}, TRUE)
  `;
  await dbQuery(updateAllRoles);

  const descendantSidebarsString =
    `$.${threadPermissionPrefixes.DESCENDANT}` +
    threadPermissions.CREATE_SIDEBARS;
  const updateAdminRoles = SQL`
    UPDATE roles
    SET permissions = JSON_SET(permissions, ${descendantSidebarsString}, TRUE)
    WHERE name = 'Admins'
  `;
  await dbQuery(updateAdminRoles);
}

async function updateAllThreadPermissions() {
  const getAllThreads = SQL`SELECT id, type FROM threads`;
  const [result] = await dbQuery(getAllThreads);

  // We handle each thread one-by-one to avoid a situation where a permission
  // calculation for a child thread, done during a call to
  // recalculateAllPermissions for the parent thread, can be incorrectly
  // overriden by a call to recalculateAllPermissions for the child thread. If
  // the changeset resulting from the parent call isn't committed before the
  // calculation is done for the child, the calculation done for the child can
  // be incorrect.
  const viewer = createScriptViewer(bots.squadbot.userID);
  for (const row of result) {
    const threadID = row.id.toString();
    const threadType = assertThreadType(row.type);
    const changeset = await recalculateAllPermissions(threadID, threadType);
    await commitMembershipChangeset(viewer, changeset);
  }
}

main();
