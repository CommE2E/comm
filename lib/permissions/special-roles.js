// @flow

import type { TRefinement } from 'tcomb';

import { roleIsAdminRole, roleIsDefaultRole } from '../shared/thread-utils.js';
import type { RoleInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { values } from '../utils/objects.js';
import { tNumEnum } from '../utils/validation-utils.js';

export const specialRoles = Object.freeze({
  DEFAULT_ROLE: 1,
  ADMIN_ROLE: 2,
});

export type SpecialRole = $Values<typeof specialRoles>;
export const specialRoleValidator: TRefinement<number> = tNumEnum(
  values(specialRoles),
);

export const defaultSpecialRoles = Object.freeze({
  Members: specialRoles.DEFAULT_ROLE,
  Admins: specialRoles.ADMIN_ROLE,
});

function patchRoleInfoWithSpecialRole(role: RoleInfo): RoleInfo {
  if (roleIsDefaultRole(role)) {
    return {
      ...role,
      specialRole: specialRoles.DEFAULT_ROLE,
    };
  } else if (roleIsAdminRole(role)) {
    return {
      ...role,
      specialRole: specialRoles.ADMIN_ROLE,
    };
  }
  return role;
}

export { patchRoleInfoWithSpecialRole };
