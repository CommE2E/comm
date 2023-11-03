// @flow

import {
  decodeRolePermissionBitmask,
  hasPermission,
  permissionsToBitmaskHex,
  rolePermissionToBitmaskHex,
  threadRolePermissionsBlobToRolePermissionBitmaskArray,
} from './minimally-encoded-thread-permissions.js';
import type { ThreadRolePermissionsBlob } from '../types/thread-permission-types.js';

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

describe('decodeRolePermissionBitmask', () => {
  it('should decode `01b` to `child_opentoplevel_visible` successfully', () => {
    expect(decodeRolePermissionBitmask('01b')).toBe(
      'child_opentoplevel_visible',
    );
  });

  it('should decode `00b` to `child_opentoplevel_know_of` successfully', () => {
    expect(decodeRolePermissionBitmask('00b')).toBe(
      'child_opentoplevel_know_of',
    );
  });

  it('should decode `01a` to `child_toplevel_visible` successfully', () => {
    expect(decodeRolePermissionBitmask('01a')).toBe('child_toplevel_visible');
  });

  it('should decode `00a` to `child_toplevel_know_of` successfully', () => {
    expect(decodeRolePermissionBitmask('00a')).toBe('child_toplevel_know_of');
  });

  it('should decode `0ab` to `child_opentoplevel_join_thread` successfully', () => {
    expect(decodeRolePermissionBitmask('0ab')).toBe(
      'child_opentoplevel_join_thread',
    );
  });

  it('should decode `018` to `child_visible` successfully', () => {
    expect(decodeRolePermissionBitmask('018')).toBe('child_visible');
  });

  it('should decode `008` to `child_know_of` successfully', () => {
    expect(decodeRolePermissionBitmask('008')).toBe('child_know_of');
  });
});

describe('threadRolePermissionsBlobToRolePermissionBitmaskArray', () => {
  const permissions: ThreadRolePermissionsBlob = {
    add_members: true,
    child_open_join_thread: true,
    create_sidebars: true,
    create_subthreads: true,
    descendant_open_know_of: true,
    descendant_open_visible: true,
    descendant_opentoplevel_join_thread: true,
    edit_entries: true,
    edit_message: true,
    edit_permissions: true,
    edit_thread: true,
    edit_thread_avatar: true,
    edit_thread_color: true,
    edit_thread_description: true,
    know_of: true,
    leave_thread: true,
    react_to_message: true,
    remove_members: true,
    visible: true,
    voiced: true,
    open_know_of: true,
    open_visible: true,
    opentoplevel_join_thread: true,
    toplevel_know_of: true,
    toplevel_visible: true,
    opentoplevel_know_of: true,
    opentoplevel_visible: true,
    child_know_of: true,
    child_visible: true,
    child_opentoplevel_join_thread: true,
    child_toplevel_know_of: true,
    child_toplevel_visible: true,
    child_opentoplevel_know_of: true,
    child_opentoplevel_visible: true,
  };

  it('should encode threadRolePermissionsBlob as bitmask array', () => {
    const threadRolePermissionsBitmaskArray =
      threadRolePermissionsBlobToRolePermissionBitmaskArray(permissions);
    expect(threadRolePermissionsBitmaskArray).toEqual([
      '0c0',
      '0a9',
      '090',
      '080',
      '005',
      '015',
      '0a7',
      '030',
      '110',
      '0b0',
      '040',
      '120',
      '060',
      '050',
      '000',
      '0f0',
      '100',
      '0d0',
      '010',
      '020',
      '001',
      '011',
      '0a3',
      '002',
      '012',
      '003',
      '013',
      '008',
      '018',
      '0ab',
      '00a',
      '01a',
      '00b',
      '01b',
    ]);
  });
});
