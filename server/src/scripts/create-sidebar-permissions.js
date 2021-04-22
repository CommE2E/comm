// @flow

import {
  threadPermissions,
  threadPermissionPropagationPrefixes,
} from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import { recalculateAllThreadPermissions } from '../updaters/thread-permission-updaters';
import { endScript } from './utils';

async function main() {
  try {
    await createSidebarPermissions();
    await recalculateAllThreadPermissions();
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
    `$.${threadPermissionPropagationPrefixes.DESCENDANT}` +
    threadPermissions.CREATE_SIDEBARS;
  const updateAdminRoles = SQL`
    UPDATE roles
    SET permissions = JSON_SET(permissions, ${descendantSidebarsString}, TRUE)
    WHERE name = 'Admins'
  `;
  await dbQuery(updateAdminRoles);
}

main();
