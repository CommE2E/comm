// @flow

import { patchRoleInfoWithSpecialRole, specialRoles } from './special-roles.js';
import type { RoleInfo } from '../types/minimally-encoded-thread-permissions-types.js';

describe('patchRoleInfoWithSpecialRole', () => {
  it('should correctly set DEFAULT_ROLE', () => {
    const role: RoleInfo = {
      minimallyEncoded: true,
      id: 'roleID',
      name: 'roleName',
      permissions: ['abc', 'def'],
      isDefault: true,
    };
    const patchedRole = patchRoleInfoWithSpecialRole(role);
    expect(patchedRole.specialRole).toBe(specialRoles.DEFAULT_ROLE);
  });

  it('should correctly set ADMIN_ROLE', () => {
    const role: RoleInfo = {
      minimallyEncoded: true,
      id: 'roleID',
      name: 'Admins',
      permissions: ['abc', 'def'],
      isDefault: false,
    };
    const patchedRole = patchRoleInfoWithSpecialRole(role);
    expect(patchedRole.specialRole).toBe(specialRoles.ADMIN_ROLE);
  });

  it('should correctly set undefined', () => {
    const role: RoleInfo = {
      minimallyEncoded: true,
      id: 'roleID',
      name: 'BLAH',
      permissions: ['abc', 'def'],
      isDefault: false,
    };
    const patchedRole = patchRoleInfoWithSpecialRole(role);
    expect(patchedRole.specialRole).toBe(undefined);
  });
});
