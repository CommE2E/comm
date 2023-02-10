// @flow

import {
  type ThreadPermissionsBlob,
  type ThreadType,
  type ThreadPermission,
  type ThreadRolePermissionsBlob,
  type ThreadPermissionInfo,
  type ThreadPermissionsInfo,
  threadPermissions,
  threadPermissionPropagationPrefixes,
} from '../types/thread-types.js';
import {
  parseThreadPermissionString,
  includeThreadPermissionForThreadType,
} from './prefixes.js';

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

export {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
  getRoleForPermissions,
};
