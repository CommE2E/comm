// @flow

import {
  type RoleInfo,
  threadPermissions,
  threadPermissionPropagationPrefixes,
  threadPermissionFilterPrefixes,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  threadTypes,
} from 'lib/types/thread-types';

import { dbQuery, SQL } from '../database/database';
import createIDs from './id-creator';

type InitialRoles = {|
  default: RoleInfo,
  creator: RoleInfo,
|};
async function createInitialRolesForNewThread(
  threadID: string,
  threadType: ThreadType,
): Promise<InitialRoles> {
  const rolePermissions = getRolePermissionBlobsForChat(threadType);
  const ids = await createIDs('roles', Object.values(rolePermissions).length);

  const time = Date.now();
  const newRows = [];
  const namesToIDs = {};
  for (const name in rolePermissions) {
    const id = ids.shift();
    namesToIDs[name] = id;
    const permissionsBlob = JSON.stringify(rolePermissions[name]);
    newRows.push([id, threadID, name, permissionsBlob, time]);
  }

  const query = SQL`
    INSERT INTO roles (id, thread, name, permissions, creation_time)
    VALUES ${newRows}
  `;
  await dbQuery(query);

  const defaultRoleInfo = {
    id: namesToIDs.Members,
    name: 'Members',
    permissions: rolePermissions.Members,
    isDefault: true,
  };
  if (!rolePermissions.Admins) {
    return {
      default: defaultRoleInfo,
      creator: defaultRoleInfo,
    };
  }

  const adminRoleInfo = {
    id: namesToIDs.Admins,
    name: 'Admins',
    permissions: rolePermissions.Admins,
    isDefault: false,
  };
  return {
    default: defaultRoleInfo,
    creator: adminRoleInfo,
  };
}

type RolePermissionBlobs = {|
  +Members: ThreadRolePermissionsBlob,
  +Admins?: ThreadRolePermissionsBlob,
|};

const { CHILD, DESCENDANT } = threadPermissionPropagationPrefixes;
const { OPEN, TOP_LEVEL, OPEN_TOP_LEVEL } = threadPermissionFilterPrefixes;
const OPEN_CHILD = CHILD + OPEN;
const OPEN_DESCENDANT = DESCENDANT + OPEN;
const TOP_LEVEL_DESCENDANT = DESCENDANT + TOP_LEVEL;
const OPEN_TOP_LEVEL_DESCENDANT = DESCENDANT + OPEN_TOP_LEVEL;

// Originally all chat threads were orgs, but for the alpha launch I decided
// it's better to keep it simple. I'll probably reintroduce orgs at some point.
// eslint-disable-next-line no-unused-vars
function getRolePermissionBlobsForOrg(): RolePermissionBlobs {
  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const topLevelDescendantMembership =
    TOP_LEVEL_DESCENDANT + threadPermissions.MEMBERSHIP;
  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const openChildMembership = OPEN_CHILD + threadPermissions.MEMBERSHIP;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;
  const memberPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.MEMBERSHIP]: true,
    [threadPermissions.VISIBLE]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [topLevelDescendantMembership]: true,
    [openTopLevelDescendantJoinThread]: true,
    [openChildMembership]: true,
    [openChildJoinThread]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD]: true,
    [threadPermissions.CREATE_SUBTHREADS]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
  };
  const descendantKnowOf = DESCENDANT + threadPermissions.KNOW_OF;
  const descendantVisible = DESCENDANT + threadPermissions.VISIBLE;
  const topLevelDescendantJoinThread =
    TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const childMembership = CHILD + threadPermissions.MEMBERSHIP;
  const childJoinThread = CHILD + threadPermissions.JOIN_THREAD;
  const descendantVoiced = DESCENDANT + threadPermissions.VOICED;
  const descendantEditEntries = DESCENDANT + threadPermissions.EDIT_ENTRIES;
  const descendantEditThread = DESCENDANT + threadPermissions.EDIT_THREAD;
  const topLevelDescendantCreateSubthreads =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SUBTHREADS;
  const topLevelDescendantCreateSidebars =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SIDEBARS;
  const descendantAddMembers = DESCENDANT + threadPermissions.ADD_MEMBERS;
  const descendantDeleteThread = DESCENDANT + threadPermissions.DELETE_THREAD;
  const descendantEditPermissions =
    DESCENDANT + threadPermissions.EDIT_PERMISSIONS;
  const descendantRemoveMembers = DESCENDANT + threadPermissions.REMOVE_MEMBERS;
  const descendantChangeRole = DESCENDANT + threadPermissions.CHANGE_ROLE;
  const adminPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.MEMBERSHIP]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD]: true,
    [threadPermissions.CREATE_SUBTHREADS]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.DELETE_THREAD]: true,
    [threadPermissions.EDIT_PERMISSIONS]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.CHANGE_ROLE]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [descendantKnowOf]: true,
    [descendantVisible]: true,
    [topLevelDescendantMembership]: true,
    [topLevelDescendantJoinThread]: true,
    [childMembership]: true,
    [childJoinThread]: true,
    [descendantVoiced]: true,
    [descendantEditEntries]: true,
    [descendantEditThread]: true,
    [topLevelDescendantCreateSubthreads]: true,
    [topLevelDescendantCreateSidebars]: true,
    [descendantAddMembers]: true,
    [descendantDeleteThread]: true,
    [descendantEditPermissions]: true,
    [descendantRemoveMembers]: true,
    [descendantChangeRole]: true,
  };
  return {
    Members: memberPermissions,
    Admins: adminPermissions,
  };
}

function getRolePermissionBlobsForChat(
  threadType: ThreadType,
): RolePermissionBlobs {
  if (threadType === threadTypes.SIDEBAR) {
    const memberPermissions = {
      [threadPermissions.VOICED]: true,
      [threadPermissions.EDIT_THREAD]: true,
      [threadPermissions.ADD_MEMBERS]: true,
      [threadPermissions.EDIT_PERMISSIONS]: true,
      [threadPermissions.REMOVE_MEMBERS]: true,
      [threadPermissions.LEAVE_THREAD]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openChildMembership = OPEN_CHILD + threadPermissions.MEMBERSHIP;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;

  if (threadType === threadTypes.PRIVATE) {
    const memberPermissions = {
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.MEMBERSHIP]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.VOICED]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [threadPermissions.EDIT_ENTRIES]: true,
      [openDescendantKnowOf]: true,
      [openDescendantVisible]: true,
      [openChildMembership]: true,
      [openChildJoinThread]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  if (threadType === threadTypes.PERSONAL) {
    return {
      Members: {
        [threadPermissions.KNOW_OF]: true,
        [threadPermissions.MEMBERSHIP]: true,
        [threadPermissions.VISIBLE]: true,
        [threadPermissions.VOICED]: true,
        [threadPermissions.EDIT_ENTRIES]: true,
        [threadPermissions.EDIT_THREAD]: true,
        [threadPermissions.CREATE_SIDEBARS]: true,
        [openDescendantKnowOf]: true,
        [openDescendantVisible]: true,
        [openChildMembership]: true,
        [openChildJoinThread]: true,
      },
    };
  }

  if (threadType === threadTypes.CHAT_NESTED_OPEN) {
    const memberPermissions = {
      [threadPermissions.VOICED]: true,
      [threadPermissions.EDIT_ENTRIES]: true,
      [threadPermissions.EDIT_THREAD]: true,
      [threadPermissions.CREATE_SUBTHREADS]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [threadPermissions.ADD_MEMBERS]: true,
      [threadPermissions.EDIT_PERMISSIONS]: true,
      [threadPermissions.REMOVE_MEMBERS]: true,
      [threadPermissions.LEAVE_THREAD]: true,
      [openChildMembership]: true,
      [openChildJoinThread]: true,
    };
    return {
      Members: memberPermissions,
    };
  }

  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const memberPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD]: true,
    [threadPermissions.CREATE_SUBTHREADS]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.EDIT_PERMISSIONS]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openTopLevelDescendantJoinThread]: true,
    [openChildMembership]: true,
    [openChildJoinThread]: true,
  };
  return {
    Members: memberPermissions,
  };
}

export { createInitialRolesForNewThread, getRolePermissionBlobsForChat };
