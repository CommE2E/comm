// @flow

import {
  type RoleInfo,
  threadPermissions,
  threadPermissionPropagationPrefixes,
  threadPermissionFilterPrefixes,
  type ThreadRolePermissionsBlob,
  type ThreadType,
  threadTypes,
} from 'lib/types/thread-types.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL } from '../database/database.js';

type InitialRoles = {
  +default: RoleInfo,
  +creator: RoleInfo,
};
async function createInitialRolesForNewThread(
  threadID: string,
  threadType: ThreadType,
): Promise<InitialRoles> {
  const rolePermissions = getRolePermissionBlobs(threadType);
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

type RolePermissionBlobs = {
  +Members: ThreadRolePermissionsBlob,
  +Admins?: ThreadRolePermissionsBlob,
};

const { CHILD, DESCENDANT } = threadPermissionPropagationPrefixes;
const { OPEN, TOP_LEVEL, OPEN_TOP_LEVEL } = threadPermissionFilterPrefixes;
const OPEN_CHILD = CHILD + OPEN;
const OPEN_DESCENDANT = DESCENDANT + OPEN;
const TOP_LEVEL_DESCENDANT = DESCENDANT + TOP_LEVEL;
const OPEN_TOP_LEVEL_DESCENDANT = DESCENDANT + OPEN_TOP_LEVEL;

const voicedPermissions = {
  [threadPermissions.VOICED]: true,
  [threadPermissions.EDIT_ENTRIES]: true,
  [threadPermissions.EDIT_THREAD_NAME]: true,
  [threadPermissions.EDIT_THREAD_COLOR]: true,
  [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
  [threadPermissions.EDIT_THREAD_AVATAR]: true,
  [threadPermissions.CREATE_SUBCHANNELS]: true,
  [threadPermissions.ADD_MEMBERS]: true,
};

function getRolePermissionBlobsForCommunity(
  threadType: ThreadType,
): RolePermissionBlobs {
  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;
  const openChildAddMembers = OPEN_CHILD + threadPermissions.ADD_MEMBERS;

  const genesisMemberPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openTopLevelDescendantJoinThread]: true,
  };
  const baseMemberPermissions = {
    ...genesisMemberPermissions,
    [threadPermissions.REACT_TO_MESSAGE]: true,
    [threadPermissions.EDIT_MESSAGE]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [openChildJoinThread]: true,
    [openChildAddMembers]: true,
  };

  let memberPermissions;
  if (threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT) {
    memberPermissions = baseMemberPermissions;
  } else if (threadType === threadTypes.GENESIS) {
    memberPermissions = genesisMemberPermissions;
  } else {
    memberPermissions = {
      ...baseMemberPermissions,
      ...voicedPermissions,
    };
  }

  const descendantKnowOf = DESCENDANT + threadPermissions.KNOW_OF;
  const descendantVisible = DESCENDANT + threadPermissions.VISIBLE;
  const topLevelDescendantJoinThread =
    TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;
  const childJoinThread = CHILD + threadPermissions.JOIN_THREAD;
  const descendantVoiced = DESCENDANT + threadPermissions.VOICED;
  const descendantEditEntries = DESCENDANT + threadPermissions.EDIT_ENTRIES;
  const descendantEditThreadName =
    DESCENDANT + threadPermissions.EDIT_THREAD_NAME;
  const descendantEditThreadColor =
    DESCENDANT + threadPermissions.EDIT_THREAD_COLOR;
  const descendantEditThreadDescription =
    DESCENDANT + threadPermissions.EDIT_THREAD_DESCRIPTION;
  const descendantEditThreadAvatar =
    DESCENDANT + threadPermissions.EDIT_THREAD_AVATAR;
  const topLevelDescendantCreateSubchannels =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SUBCHANNELS;
  const topLevelDescendantCreateSidebars =
    TOP_LEVEL_DESCENDANT + threadPermissions.CREATE_SIDEBARS;
  const descendantAddMembers = DESCENDANT + threadPermissions.ADD_MEMBERS;
  const descendantDeleteThread = DESCENDANT + threadPermissions.DELETE_THREAD;
  const descendantEditPermissions =
    DESCENDANT + threadPermissions.EDIT_PERMISSIONS;
  const descendantRemoveMembers = DESCENDANT + threadPermissions.REMOVE_MEMBERS;
  const descendantChangeRole = DESCENDANT + threadPermissions.CHANGE_ROLE;

  const baseAdminPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.VOICED]: true,
    [threadPermissions.REACT_TO_MESSAGE]: true,
    [threadPermissions.EDIT_MESSAGE]: true,
    [threadPermissions.EDIT_ENTRIES]: true,
    [threadPermissions.EDIT_THREAD_NAME]: true,
    [threadPermissions.EDIT_THREAD_COLOR]: true,
    [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
    [threadPermissions.EDIT_THREAD_AVATAR]: true,
    [threadPermissions.CREATE_SUBCHANNELS]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.ADD_MEMBERS]: true,
    [threadPermissions.DELETE_THREAD]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.CHANGE_ROLE]: true,
    [descendantKnowOf]: true,
    [descendantVisible]: true,
    [topLevelDescendantJoinThread]: true,
    [childJoinThread]: true,
    [descendantVoiced]: true,
    [descendantEditEntries]: true,
    [descendantEditThreadName]: true,
    [descendantEditThreadColor]: true,
    [descendantEditThreadDescription]: true,
    [descendantEditThreadAvatar]: true,
    [topLevelDescendantCreateSubchannels]: true,
    [topLevelDescendantCreateSidebars]: true,
    [descendantAddMembers]: true,
    [descendantDeleteThread]: true,
    [descendantEditPermissions]: true,
    [descendantRemoveMembers]: true,
    [descendantChangeRole]: true,
  };

  let adminPermissions;
  if (threadType === threadTypes.GENESIS) {
    adminPermissions = baseAdminPermissions;
  } else {
    adminPermissions = {
      ...baseAdminPermissions,
      [threadPermissions.LEAVE_THREAD]: true,
    };
  }

  return {
    Members: memberPermissions,
    Admins: adminPermissions,
  };
}

function getRolePermissionBlobs(threadType: ThreadType): RolePermissionBlobs {
  if (threadType === threadTypes.SIDEBAR) {
    const memberPermissions = {
      [threadPermissions.VOICED]: true,
      [threadPermissions.REACT_TO_MESSAGE]: true,
      [threadPermissions.EDIT_MESSAGE]: true,
      [threadPermissions.EDIT_THREAD_NAME]: true,
      [threadPermissions.EDIT_THREAD_COLOR]: true,
      [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
      [threadPermissions.EDIT_THREAD_AVATAR]: true,
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
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;

  if (threadType === threadTypes.PRIVATE) {
    const memberPermissions = {
      [threadPermissions.KNOW_OF]: true,
      [threadPermissions.VISIBLE]: true,
      [threadPermissions.VOICED]: true,
      [threadPermissions.REACT_TO_MESSAGE]: true,
      [threadPermissions.EDIT_MESSAGE]: true,
      [threadPermissions.EDIT_THREAD_COLOR]: true,
      [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
      [threadPermissions.CREATE_SIDEBARS]: true,
      [threadPermissions.EDIT_ENTRIES]: true,
      [openDescendantKnowOf]: true,
      [openDescendantVisible]: true,
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
        [threadPermissions.VISIBLE]: true,
        [threadPermissions.VOICED]: true,
        [threadPermissions.REACT_TO_MESSAGE]: true,
        [threadPermissions.EDIT_MESSAGE]: true,
        [threadPermissions.EDIT_ENTRIES]: true,
        [threadPermissions.EDIT_THREAD_NAME]: true,
        [threadPermissions.EDIT_THREAD_COLOR]: true,
        [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
        [threadPermissions.EDIT_THREAD_AVATAR]: true,
        [threadPermissions.CREATE_SIDEBARS]: true,
        [openDescendantKnowOf]: true,
        [openDescendantVisible]: true,
        [openChildJoinThread]: true,
      },
    };
  }

  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;

  const subthreadBasePermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [threadPermissions.REACT_TO_MESSAGE]: true,
    [threadPermissions.EDIT_MESSAGE]: true,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openTopLevelDescendantJoinThread]: true,
    [openChildJoinThread]: true,
  };

  if (
    threadType === threadTypes.COMMUNITY_OPEN_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_SUBTHREAD
  ) {
    const memberPermissions = {
      [threadPermissions.REMOVE_MEMBERS]: true,
      [threadPermissions.EDIT_PERMISSIONS]: true,
      ...subthreadBasePermissions,
      ...voicedPermissions,
    };
    return {
      Members: memberPermissions,
    };
  }

  if (
    threadType === threadTypes.COMMUNITY_OPEN_ANNOUNCEMENT_SUBTHREAD ||
    threadType === threadTypes.COMMUNITY_SECRET_ANNOUNCEMENT_SUBTHREAD
  ) {
    return {
      Members: subthreadBasePermissions,
    };
  }

  return getRolePermissionBlobsForCommunity(threadType);
}

export { createInitialRolesForNewThread, getRolePermissionBlobs };
