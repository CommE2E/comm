// @flow

import {
  type ThreadPermissionsBlob,
  type ThreadType,
  type ThreadPermission,
  type ThreadRolePermissionsBlob,
  type ThreadPermissionsInfo,
  threadTypes,
  threadPermissions,
  threadPermissionPrefixes,
  assertThreadPermissions,
} from '../types/thread-types';

function permissionLookup(
  permissions: ?ThreadPermissionsBlob,
  permission: ThreadPermission,
): boolean {
  if (!permissions || !permissions[permission]) {
    return false;
  }
  return permissions[permission].value;
}

function getAllThreadPermissions(
  permissions: ?ThreadPermissionsBlob,
  threadID: string,
): ThreadPermissionsInfo {
  const result = {};
  for (let permissionName in threadPermissions) {
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
  const permissions = {};

  if (permissionsFromParent) {
    for (let permissionKey: any in permissionsFromParent) {
      const permissionValue = permissionsFromParent[permissionKey];
      if (
        threadType === threadTypes.CHAT_SECRET &&
        (permissionKey.startsWith(threadPermissionPrefixes.OPEN_DESCENDANT) ||
          permissionKey.startsWith(threadPermissionPrefixes.OPEN))
      ) {
        continue;
      }
      if (permissionKey.startsWith(threadPermissionPrefixes.OPEN)) {
        const strippedPermissionKey = assertThreadPermissions(
          permissionKey.substr(5),
        );
        permissions[strippedPermissionKey] = permissionValue;
        continue;
      }
      permissions[permissionKey] = permissionValue;
    }
  }

  if (rolePermissions) {
    for (let permissionKey in rolePermissions) {
      const permissionValue = rolePermissions[permissionKey];
      const currentValue = permissions[permissionKey];
      if (
        permissionValue ||
        (!permissionValue && (!currentValue || !currentValue.value))
      ) {
        permissions[permissionKey] = {
          value: permissionValue,
          source: threadID,
        };
      }
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
  const permissionsForChildren = {};
  for (let permissionKey in permissions) {
    const permissionValue = permissions[permissionKey];
    if (permissionKey.startsWith(threadPermissionPrefixes.DESCENDANT)) {
      permissionsForChildren[permissionKey] = permissionValue;
      permissionsForChildren[permissionKey.substr(11)] = permissionValue;
    } else if (permissionKey.startsWith(threadPermissionPrefixes.CHILD)) {
      permissionsForChildren[permissionKey.substr(6)] = permissionValue;
    }
  }
  if (Object.keys(permissionsForChildren).length === 0) {
    return null;
  }
  return permissionsForChildren;
}

export {
  permissionLookup,
  getAllThreadPermissions,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
};
