// @flow

import {
  type RoleInfo,
  threadPermissions,
  threadPermissionPrefixes,
} from 'lib/types/thread-types';

import { pool, SQL } from '../database';
import createIDs from './id-creator';

type InitialRoles = {|
  members: RoleInfo,
  admins: RoleInfo,
|};
async function createInitialRolesForNewThread(
  threadID: string,
): Promise<InitialRoles> {
  const [ memberRoleID, adminRoleID ] = await createIDs("roles", 2);

  const openDescendantKnowOf =
    threadPermissionPrefixes.OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible =
    threadPermissionPrefixes.OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openDescendantJoinThread =
    threadPermissionPrefixes.OPEN_DESCENDANT + threadPermissions.JOIN_THREAD;
  const memberPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.JOIN_THREAD]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openDescendantJoinThread]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD]: true,
    [threadPermissions.CREATE_SUBTHREADS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
  };
  const descendantKnowOf =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.KNOW_OF;
  const descendantVisible =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.VISIBLE;
  const descendantJoinThread =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.JOIN_THREAD;
  const descendantVoiced =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.VOICED;
  const descendantEditEntries =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.EDIT_ENTRIES;
  const descendantEditThread =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.EDIT_THREAD;
  const descendantCreateSubthreads =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.CREATE_SUBTHREADS;
  const descendantAddMembers =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.ADD_MEMBERS;
  const descendantDeleteThread =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.DELETE_THREAD;
  const descendantEditPermissions =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.EDIT_PERMISSIONS;
  const descendantRemoveMembers =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.REMOVE_MEMBERS;
  const descendantChangeRole =
    threadPermissionPrefixes.DESCENDANT + threadPermissions.CHANGE_ROLE;
  const adminPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.JOIN_THREAD]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD]: true,
    [threadPermissions.CREATE_SUBTHREADS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.DELETE_THREAD]: true,
    [threadPermissions.EDIT_PERMISSIONS]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.CHANGE_ROLE]: true,
    [descendantKnowOf]: true,
    [descendantVisible]: true,
    [descendantJoinThread]: true,
    [descendantVoiced]: true,
    [descendantEditEntries]: true,
    [descendantEditThread]: true,
    [descendantCreateSubthreads]: true,
    [descendantAddMembers]: true,
    [descendantDeleteThread]: true,
    [descendantEditPermissions]: true,
    [descendantRemoveMembers]: true,
    [descendantChangeRole]: true,
  };

  const time = Date.now();
  const newRows = [
    [
      memberRoleID,
      threadID,
      "Members",
      JSON.stringify(memberPermissions),
      time,
    ],
    [
      adminRoleID,
      threadID,
      "Admins",
      JSON.stringify(adminPermissions),
      time,
    ],
  ];
  const query = SQL`
    INSERT INTO roles (id, thread, name, permissions, creation_time)
    VALUES ${newRows}
  `;
  await pool.query(query);

  return {
    members: {
      id: memberRoleID,
      name: "Members",
      permissions: memberPermissions,
      isDefault: true,
    },
    admins: {
      id: adminRoleID,
      name: "Admins",
      permissions: adminPermissions,
      isDefault: false,
    },
  };
}

export default createInitialRolesForNewThread;
