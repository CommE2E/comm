// @flow

import type {
  ThreadPermissionsBlob,
  VisibilityRules,
  ThreadPermission,
} from 'lib/types/thread-types';

import {
  visibilityRules,
  threadPermissions,
} from 'lib/types/thread-types';

import { currentViewer } from '../session/viewer';

type PermissionsInfo = {
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
  permissionsInfo: PermissionsInfo,
  permission: ThreadPermission,
): bool {
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
): ThreadPermissionsBlob {
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

export {
  permissionLookup,
  permissionHelper,
  getAllThreadPermissions,
};
