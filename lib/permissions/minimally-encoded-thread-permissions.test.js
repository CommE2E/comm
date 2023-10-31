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
  it('should encode `child_opentoplevel_visible` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_opentoplevel_visible')).toBe(
      '01b',
    );
  });

  it('should encode `child_opentoplevel_know_of` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_opentoplevel_know_of')).toBe(
      '00b',
    );
  });

  it('should encode `child_toplevel_visible` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_toplevel_visible')).toBe('01a');
  });

  it('should encode `child_toplevel_know_of` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_toplevel_know_of')).toBe('00a');
  });

  it('should encode `child_opentoplevel_join_thread` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_opentoplevel_join_thread')).toBe(
      '0ab',
    );
  });

  it('should encode `child_visible` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_visible')).toBe('018');
  });

  it('should encode `child_know_of` successfully', () => {
    expect(rolePermissionToBitmaskHex('child_know_of')).toBe('008');
  });
});
