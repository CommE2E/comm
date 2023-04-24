// @flow

import {
  parseThreadPermissionString,
  includeThreadPermissionForThreadType,
} from './prefixes.js';
import {
  type ThreadPermissionsBlob,
  type ThreadType,
  type ThreadPermission,
  type ThreadRolePermissionsBlob,
  type ThreadPermissionInfo,
  type ThreadPermissionsInfo,
  threadPermissions,
  threadPermissionPropagationPrefixes,
  threadPermissionFilterPrefixes,
  threadTypes,
} from '../types/thread-types.js';

function permissionLookup(
  permissions: ?ThreadPermissionsBlob | ?ThreadPermissionsInfo,
  permission: ThreadPermission,
): boolean {
  return !!(
    permissions &&
    permissions[permission] &&
    permissions[permission].value &&
    permissions[threadPermissions.KNOW_OF] &&
    permissions[threadPermissions.KNOW_OF].value
  );
}

function getAllThreadPermissions(
  permissions: ?ThreadPermissionsBlob,
  threadID: string,
): ThreadPermissionsInfo {
  const result = {};
  for (const permissionName in threadPermissions) {
    const permissionKey = threadPermissions[permissionName];
    const permission = permissionLookup(permissions, permissionKey);
    let source = null;
    if (permission) {
      if (permissions && permissions[permissionKey]) {
        source = permissions[permissionKey].source;
      } else {
        source = threadID;
      }
    }
    result[permissionKey] = { value: permission, source };
  }
  return result;
}

// - rolePermissions can be null if role <= 0, ie. not a member
// - permissionsFromParent can be null if there are no permissions from the
//   parent
// - return can be null if no permissions exist
function makePermissionsBlob(
  rolePermissions: ?ThreadRolePermissionsBlob,
  permissionsFromParent: ?ThreadPermissionsBlob,
  threadID: string,
  threadType: ThreadType,
): ?ThreadPermissionsBlob {
  let permissions = {};

  if (permissionsFromParent) {
    for (const permissionKey in permissionsFromParent) {
      const permissionValue = permissionsFromParent[permissionKey];
      const parsed = parseThreadPermissionString(permissionKey);
      if (!includeThreadPermissionForThreadType(parsed, threadType)) {
        continue;
      }
      if (parsed.propagationPrefix) {
        permissions[permissionKey] = permissionValue;
      } else {
        permissions[parsed.permission] = permissionValue;
      }
    }
  }

  const combinedPermissions: {
    [permission: string]: ThreadPermissionInfo,
  } = { ...permissions };
  if (rolePermissions) {
    for (const permissionKey in rolePermissions) {
      const permissionValue = rolePermissions[permissionKey];
      const currentValue = combinedPermissions[permissionKey];
      if (permissionValue) {
        combinedPermissions[permissionKey] = {
          value: true,
          source: threadID,
        };
      } else if (!currentValue || !currentValue.value) {
        combinedPermissions[permissionKey] = {
          value: false,
          source: null,
        };
      }
    }
  }
  if (permissionLookup(combinedPermissions, threadPermissions.KNOW_OF)) {
    permissions = combinedPermissions;
  }

  if (Object.keys(permissions).length === 0) {
    return null;
  }

  return permissions;
}

function makePermissionsForChildrenBlob(
  permissions: ?ThreadPermissionsBlob,
): ?ThreadPermissionsBlob {
  if (!permissions) {
    return null;
  }
  const permissionsForChildren = {};
  for (const permissionKey in permissions) {
    const permissionValue = permissions[permissionKey];
    const parsed = parseThreadPermissionString(permissionKey);
    if (!parsed.propagationPrefix) {
      continue;
    }
    if (
      parsed.propagationPrefix ===
      threadPermissionPropagationPrefixes.DESCENDANT
    ) {
      permissionsForChildren[permissionKey] = permissionValue;
    }
    const permissionWithFilterPrefix = parsed.filterPrefix
      ? `${parsed.filterPrefix}${parsed.permission}`
      : parsed.permission;
    permissionsForChildren[permissionWithFilterPrefix] = permissionValue;
  }
  if (Object.keys(permissionsForChildren).length === 0) {
    return null;
  }
  return permissionsForChildren;
}

function getRoleForPermissions(
  inputRole: string,
  permissions: ?ThreadPermissionsBlob,
): string {
  if (!permissionLookup(permissions, threadPermissions.KNOW_OF)) {
    return '-1';
  } else if (Number(inputRole) <= 0) {
    return '0';
  } else {
    return inputRole;
  }
}

export type RolePermissionBlobs = {
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
  const descendantManagePins = DESCENDANT + threadPermissions.MANAGE_PINS;

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
    [threadPermissions.MANAGE_PINS]: true,
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
    [descendantManagePins]: true,
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

export {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
  getRolePermissionBlobs,
};
