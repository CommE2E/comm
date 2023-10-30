// @flow

import {
  hasPermission,
  permissionsToBitmaskHex,
  rolePermissionToBitmaskHex,
} from './minimally-encoded-thread-permissions.js';

describe('minimallyEncodedThreadPermissions', () => {
  const permissions = {
    know_of: { value: true, source: '1' },
    visible: { value: true, source: '1' },
    voiced: { value: true, source: '1' },
    edit_entries: { value: true, source: '1' },
    edit_thread: { value: true, source: '1' },
    edit_thread_description: { value: true, source: '1' },
    edit_thread_color: { value: true, source: '1' },
    delete_thread: { value: true, source: '1' },
    create_subthreads: { value: true, source: '1' },
    create_sidebars: { value: true, source: '1' },
    join_thread: { value: false, source: null },
    edit_permissions: { value: false, source: null },
    add_members: { value: true, source: '1' },
    remove_members: { value: true, source: '1' },
    change_role: { value: true, source: '1' },
    leave_thread: { value: false, source: null },
    react_to_message: { value: true, source: '1' },
    edit_message: { value: true, source: '1' },
  };

  it('should encode ThreadPermissionsInfo as bitmask', () => {
    const permissionsBitmask = permissionsToBitmaskHex(permissions);
    expect(permissionsBitmask).toBe('373ff');
    expect(hasPermission(permissionsBitmask, 'know_of')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'visible')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'voiced')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'edit_entries')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'edit_thread')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'edit_thread_description')).toBe(
      true,
    );
    expect(hasPermission(permissionsBitmask, 'edit_thread_color')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'delete_thread')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'create_subthreads')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'create_sidebars')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'join_thread')).toBe(false);
    expect(hasPermission(permissionsBitmask, 'edit_permissions')).toBe(false);
    expect(hasPermission(permissionsBitmask, 'remove_members')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'change_role')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'leave_thread')).toBe(false);
    expect(hasPermission(permissionsBitmask, 'react_to_message')).toBe(true);
    expect(hasPermission(permissionsBitmask, 'edit_message')).toBe(true);
  });
});

describe('rolePermissionToBitmaskHex', () => {
  it('should encode variants of `know_of` as bitmask', () => {
    expect(rolePermissionToBitmaskHex(`know_of`)).not.toBe(1);
    expect(rolePermissionToBitmaskHex(`know_of`)).not.toBe('0');
    expect(rolePermissionToBitmaskHex(`know_of`)).not.toBe('');
    expect(rolePermissionToBitmaskHex(`know_of`)).toBe('1');

    expect(rolePermissionToBitmaskHex(`descendant_know_of`)).toBe('2');
    expect(rolePermissionToBitmaskHex(`child_know_of`)).toBe('4');
    expect(rolePermissionToBitmaskHex(`open_know_of`)).toBe('8');
    expect(rolePermissionToBitmaskHex(`toplevel_know_of`)).toBe('10');
    expect(rolePermissionToBitmaskHex(`opentoplevel_know_of`)).toBe('20');
    expect(rolePermissionToBitmaskHex(`descendant_open_know_of`)).toBe('40');
    expect(rolePermissionToBitmaskHex(`descendant_toplevel_know_of`)).toBe(
      '80',
    );
    expect(rolePermissionToBitmaskHex(`descendant_opentoplevel_know_of`)).toBe(
      '100',
    );
    expect(rolePermissionToBitmaskHex(`child_open_know_of`)).toBe('200');
    expect(rolePermissionToBitmaskHex(`child_toplevel_know_of`)).toBe('400');
    expect(rolePermissionToBitmaskHex(`child_opentoplevel_know_of`)).toBe(
      '800',
    );
  });

  it('should fail to encode invalid variants of `know_of` as bitmask', () => {
    expect(() => rolePermissionToBitmaskHex(`ancestor_know_of`)).toThrow(
      'string is not threadPermissions enum',
    );

    expect(() => rolePermissionToBitmaskHex(`announcement_know_of`)).toThrow(
      'string is not threadPermissions enum',
    );
  });
});
