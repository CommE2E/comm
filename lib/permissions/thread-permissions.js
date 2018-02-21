// @flow

import {
  type ThreadPermissionsBlob,
  type VisibilityRules,
  type ThreadPermission,
  type ThreadRolePermissionsBlob,
  type ThreadPermissionsInfo,
  visibilityRules,
  threadPermissions,
  threadPermissionPrefixes,
  assertThreadPermissions,
} from '../types/thread-types';

export type PermissionsInfo = {
  permissions: ?ThreadPermissionsBlob,
  visibilityRules: VisibilityRules,
};

function permissionLookup(
  permissions: ?ThreadPermissionsBlob,
  permission: ThreadPermission,
): bool {
  if (!permissions || !permissions[permission]) {
    return false;
  }
  return permissions[permission].value;
}

function permissionHelper(
  permissionsInfo: ?PermissionsInfo,
  permission: ThreadPermission,
): bool {
  if (!permissionsInfo) {
    return false;
  }
  const visRules = permissionsInfo.visibilityRules;
  if (
    (
      permission === threadPermissions.KNOW_OF && (
        visRules === visibilityRules.OPEN ||
        visRules === visibilityRules.CLOSED
      )
    ) ||
    (
      permission === threadPermissions.VISIBLE &&
      visRules === visibilityRules.OPEN
    ) ||
    (
      permission === threadPermissions.JOIN_THREAD && (
        visRules === visibilityRules.OPEN ||
        visRules === visibilityRules.CLOSED || // with closed or secret, you
        visRules === visibilityRules.SECRET    // need to know thread password
      )
    )
  ) {
    return true;
  }
  return permissionLookup(permissionsInfo.permissions, permission);
}

function getAllThreadPermissions(
  permissionsInfo: PermissionsInfo,
  threadID: string,
): ThreadPermissionsInfo {
  const result = {};
  for (let permissionName in threadPermissions) {
    const permissionKey = threadPermissions[permissionName]
    const permission = permissionHelper(permissionsInfo, permissionKey);
    let source = null;
    if (permission) {
      if (
        permissionsInfo.permissions &&
        permissionsInfo.permissions[permissionKey]
      ) {
        source = permissionsInfo.permissions[permissionKey].source;
      } else {
        source = threadID;
      }
    }
    result[permissionKey] = { value: permission, source };
  }
  return result;
}

function visRulesAreOpen(visRules: VisibilityRules): bool {
  return visRules === visibilityRules.OPEN ||
    visRules === visibilityRules.CHAT_NESTED_OPEN;
}

// - rolePermissions can be null if role = 0, ie. not a member
// - permissionsFromParent can be null if there are no permissions from the
//   parent
// - return can be null if no permissions exist
function makePermissionsBlob(
  rolePermissions: ?ThreadRolePermissionsBlob,
  permissionsFromParent: ?ThreadPermissionsBlob,
  threadID: string,
  visRules: VisibilityRules,
): ?ThreadPermissionsBlob {
  const permissions = {};

  if (permissionsFromParent) {
    for (let permissionKey: any in permissionsFromParent) {
      const permissionValue = permissionsFromParent[permissionKey];
      if (
        !visRulesAreOpen(visRules) &&
        (
          permissionKey.startsWith(threadPermissionPrefixes.OPEN_DESCENDANT) ||
          permissionKey.startsWith(threadPermissionPrefixes.OPEN)
        )
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
  permissionHelper,
  getAllThreadPermissions,
  visRulesAreOpen,
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
};
