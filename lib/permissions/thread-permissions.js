// @flow

import invariant from 'invariant';

import {
  parseThreadPermissionString,
  constructThreadPermissionString,
  includeThreadPermissionForThreadType,
} from './prefixes.js';
import {
  threadSpecs,
  threadTypeIsAnnouncementThread,
} from '../shared/threads/thread-specs.js';
import {
  threadPermissionPropagationPrefixes,
  threadPermissions,
  threadPermissionsRequiringVoicedInAnnouncementChannels,
  threadPermissionsRemovedForGenesisMembers,
} from '../types/thread-permission-types.js';
import type {
  ThreadPermission,
  ThreadPermissionInfo,
  ThreadPermissionsBlob,
  ThreadPermissionsInfo,
  ThreadRolePermissionsBlob,
} from '../types/thread-permission-types.js';
import { type ThreadType, threadTypes } from '../types/thread-types-enum.js';

export type RolePermissionBlobs = {
  +Members: ThreadRolePermissionsBlob,
  +Admins?: ThreadRolePermissionsBlob,
};

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
  for (const permissionName of Object.keys(threadPermissions)) {
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

  const isMember = !!rolePermissions;

  if (permissionsFromParent) {
    for (const permissionKey in permissionsFromParent) {
      const permissionValue = permissionsFromParent[permissionKey];
      const parsed = parseThreadPermissionString(permissionKey);
      if (!includeThreadPermissionForThreadType(parsed, threadType, isMember)) {
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
  if (
    threadIsAnnouncementThread &&
    !hasVoicedInAnnouncementChannelsPermission
  ) {
    for (const permission of threadPermissionsRequiringVoicedInAnnouncementChannels) {
      delete permissions[permission];
    }
  }
  if (
    threadType === threadTypes.GENESIS &&
    !hasVoicedInAnnouncementChannelsPermission
  ) {
    for (const permission of threadPermissionsRemovedForGenesisMembers) {
      delete permissions[permission];
    }
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
    const withoutPropagationPrefix = constructThreadPermissionString({
      ...parsed,
      propagationPrefix: null,
    });
    permissionsForChildren[withoutPropagationPrefix] = permissionValue;
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

function getRolePermissionBlobs(threadType: ThreadType): RolePermissionBlobs {
  return threadSpecs[threadType].protocol().getRolePermissionBlobs(threadType);
}

export {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
  getRolePermissionBlobs,
};
