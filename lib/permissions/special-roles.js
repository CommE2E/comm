// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import type { TRefinement } from 'tcomb';

import { roleIsAdminRole, roleIsDefaultRole } from '../shared/thread-utils.js';
import type {
  RawThreadInfo,
  RoleInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';
import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

export const specialRoles = Object.freeze({
  DEFAULT_ROLE: 1,
  ADMIN_ROLE: 2,
});

export type SpecialRole = $Values<typeof specialRoles>;
export const specialRoleValidator: TRefinement<SpecialRole> = tNumEnum(
  values(specialRoles),
);

export const defaultSpecialRoles = Object.freeze({
  Members: specialRoles.DEFAULT_ROLE,
  Admins: specialRoles.ADMIN_ROLE,
});

function patchRoleInfoWithSpecialRole(role: RoleInfo): RoleInfo {
  // We removed the `.isDefault` field from `RoleInfo`, but persisted
  // `RoleInfo`s will still have the field until this migration.
  // $FlowIgnore[prop-missing]
  const { isDefault, ...roleSansIsDefault } = role;
  if (roleIsDefaultRole(role)) {
    return {
      ...roleSansIsDefault,
      specialRole: specialRoles.DEFAULT_ROLE,
    };
  } else if (roleIsAdminRole(role)) {
    return {
      ...roleSansIsDefault,
      specialRole: specialRoles.ADMIN_ROLE,
    };
  } else {
    return {
      ...roleSansIsDefault,
      specialRole: null,
    };
  }
}

function patchRawThreadInfoWithSpecialRole(
  rawThreadInfo: RawThreadInfo,
): RawThreadInfo {
  return {
    ...rawThreadInfo,
    roles: _mapValues(patchRoleInfoWithSpecialRole)(rawThreadInfo.roles),
  };
}

function patchRawThreadInfosWithSpecialRole(
  rawThreadInfos: RawThreadInfos,
): RawThreadInfos {
  return _mapValues(patchRawThreadInfoWithSpecialRole)(rawThreadInfos);
}

export {
  patchRoleInfoWithSpecialRole,
  patchRawThreadInfosWithSpecialRole,
  patchRawThreadInfoWithSpecialRole,
};
