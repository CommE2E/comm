// @flow

import invariant from 'invariant';

import {
  parseThreadPermissionString,
  includeThreadPermissionForThreadType,
} from './prefixes.js';
import {
  configurableCommunityPermissions,
  threadPermissionFilterPrefixes,
  threadPermissionPropagationPrefixes,
  threadPermissions,
  userSurfacedPermissions,
} from '../types/thread-permission-types.js';
import type {
  ThreadPermission,
  ThreadPermissionInfo,
  ThreadPermissionsBlob,
  ThreadPermissionsInfo,
  ThreadRolePermissionsBlob,
  UserSurfacedPermission,
} from '../types/thread-permission-types.js';
import {
  type ThreadType,
  threadTypes,
  threadTypeIsAnnouncementThread,
} from '../types/thread-types-enum.js';

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
  const result: { [permission: ThreadPermission]: ThreadPermissionInfo } = {};
  for (const permissionName in threadPermissions) {
    const permissionKey = threadPermissions[permissionName];
    const permission = permissionLookup(permissions, permissionKey);
    let entry: ThreadPermissionInfo = { value: false, source: null };
    if (permission) {
      const blobEntry = permissions ? permissions[permissionKey] : null;
      if (blobEntry) {
        invariant(
          blobEntry.value,
          'permissionLookup returned true but blob had false permission!',
        );
        entry = { value: true, source: blobEntry.source };
      } else {
        entry = { value: true, source: threadID };
      }
    }
    result[permissionKey] = entry;
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
  let permissions: { [permission: string]: ThreadPermissionInfo } = {};

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

  const threadIsAnnouncementThread = threadTypeIsAnnouncementThread(threadType);
  const hasVoicedInAnnouncementChannelsPermission = permissionLookup(
    (permissions: ThreadPermissionsBlob),
    threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
  );
  const isMember = !!rolePermissions;

  if (
    threadIsAnnouncementThread &&
    hasVoicedInAnnouncementChannelsPermission &&
    isMember
  ) {
    permissions[threadPermissions.VOICED] = {
      value: true,
      source: threadID,
    };
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
  const permissionsForChildren: { [permission: string]: ThreadPermissionInfo } =
    {};
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

function getThreadPermissionBlobFromUserSurfacedPermissions(
  communityUserSurfacedPermissions: $ReadOnlyArray<UserSurfacedPermission>,
  threadType: ThreadType,
): ThreadRolePermissionsBlob {
  const mappedUserSurfacedPermissions = communityUserSurfacedPermissions
    .map(permission => [...configurableCommunityPermissions[permission]])
    .flat();

  const userSurfacedPermissionsObj = Object.fromEntries(
    mappedUserSurfacedPermissions.map(p => [p, true]),
  );

  const universalCommunityPermissions =
    getUniversalCommunityRootPermissionsBlob(threadType);

  return {
    ...universalCommunityPermissions,
    ...userSurfacedPermissionsObj,
  };
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

const baseMemberUserSurfacedPermissions = [
  userSurfacedPermissions.REACT_TO_MESSAGES,
  userSurfacedPermissions.EDIT_MESSAGES,
  userSurfacedPermissions.ADD_MEMBERS,
];
const baseVoicedUserSurfacedPermissions = [
  userSurfacedPermissions.EDIT_CALENDAR,
  userSurfacedPermissions.CREATE_AND_EDIT_CHANNELS,
];

function getRolePermissionBlobsForCommunityRoot(
  threadType: ThreadType,
): RolePermissionBlobs {
  let memberUserSurfacedPermissions;
  if (threadType === threadTypes.GENESIS) {
    memberUserSurfacedPermissions = [];
  } else if (threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT) {
    memberUserSurfacedPermissions = baseMemberUserSurfacedPermissions;
  } else {
    memberUserSurfacedPermissions = [
      ...baseMemberUserSurfacedPermissions,
      ...baseVoicedUserSurfacedPermissions,
    ];
  }

  const memberPermissions = getThreadPermissionBlobFromUserSurfacedPermissions(
    memberUserSurfacedPermissions,
    threadType,
  );

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
  const topLevelDescendantVoicedInAnnouncementChannels =
    TOP_LEVEL_DESCENDANT + threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS;

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
    [threadPermissions.DELETE_THREAD]: true,
    [threadPermissions.REMOVE_MEMBERS]: true,
    [threadPermissions.CHANGE_ROLE]: true,
    [threadPermissions.MANAGE_PINS]: true,
    [threadPermissions.MANAGE_INVITE_LINKS]: true,
    [threadPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS]: true,
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
    [topLevelDescendantVoicedInAnnouncementChannels]: true,
  };

  let adminPermissions;
  if (threadType === threadTypes.GENESIS) {
    adminPermissions = {
      ...baseAdminPermissions,
      [threadPermissions.ADD_MEMBERS]: true,
    };
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

const nonCommunityVoicedPermissions = {
  [threadPermissions.VOICED]: true,
  [threadPermissions.EDIT_ENTRIES]: true,
  [threadPermissions.EDIT_THREAD_NAME]: true,
  [threadPermissions.EDIT_THREAD_COLOR]: true,
  [threadPermissions.EDIT_THREAD_DESCRIPTION]: true,
  [threadPermissions.EDIT_THREAD_AVATAR]: true,
  [threadPermissions.CREATE_SUBCHANNELS]: true,
  [threadPermissions.ADD_MEMBERS]: true,
};

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
      ...nonCommunityVoicedPermissions,
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

  return getRolePermissionBlobsForCommunityRoot(threadType);
}

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
function getUniversalCommunityRootPermissionsBlob(
  threadType: ThreadType,
): ThreadRolePermissionsBlob {
  const openDescendantKnowOf = OPEN_DESCENDANT + threadPermissions.KNOW_OF;
  const openDescendantVisible = OPEN_DESCENDANT + threadPermissions.VISIBLE;
  const openChildJoinThread = OPEN_CHILD + threadPermissions.JOIN_THREAD;
  const openTopLevelDescendantJoinThread =
    OPEN_TOP_LEVEL_DESCENDANT + threadPermissions.JOIN_THREAD;

  const genesisUniversalCommunityPermissions = {
    [threadPermissions.KNOW_OF]: true,
    [threadPermissions.VISIBLE]: true,
    [openDescendantKnowOf]: true,
    [openDescendantVisible]: true,
    [openTopLevelDescendantJoinThread]: true,
  };

  const baseUniversalCommunityPermissions = {
    ...genesisUniversalCommunityPermissions,
    [threadPermissions.CREATE_SIDEBARS]: true,
    [threadPermissions.LEAVE_THREAD]: true,
    [openChildJoinThread]: true,
  };

  if (threadType === threadTypes.GENESIS) {
    return genesisUniversalCommunityPermissions;
  } else if (threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT) {
    return baseUniversalCommunityPermissions;
  } else if (threadType === threadTypes.COMMUNITY_ROOT) {
    return {
      ...baseUniversalCommunityPermissions,
      [threadPermissions.VOICED]: true,
    };
  }

  invariant(false, 'invalid threadType parameter');
}

export {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
  getThreadPermissionBlobFromUserSurfacedPermissions,
  getRolePermissionBlobs,
  getUniversalCommunityRootPermissionsBlob,
};
