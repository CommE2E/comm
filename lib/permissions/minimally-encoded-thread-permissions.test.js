// @flow

import {
  hasPermission,
  permissionsToBitmaskHex,
  rolePermissionsToBitmaskHex,
  rolePermissionToBitmask,
} from './minimally-encoded-thread-permissions.js';
import { parseThreadPermissionString } from './prefixes.js';
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

// TODO (atul): Update flow to `194.0.0` for bigint support
// $FlowIssue bigint-unsupported
describe('rolePermissionToBitmaskHex', () => {
  it('should encode variants of `know_of` as bitmask', () => {
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`know_of`)),
    ).not.toBe(1);
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`know_of`)),
    ).not.toBe('0');
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`know_of`)),
    ).not.toBe('');
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`know_of`)),
    ).toBe(
      // $FlowIssue bigint-unsupported
      1n,
    );

    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`descendant_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      2n,
    );
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`child_know_of`)),
    ).toBe(
      // $FlowIssue bigint-unsupported
      4n,
    );
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`open_know_of`)),
    ).toBe(
      // $FlowIssue bigint-unsupported
      8n,
    );
    expect(
      rolePermissionToBitmask(parseThreadPermissionString(`toplevel_know_of`)),
    ).toBe(
      // $FlowIssue bigint-unsupported
      16n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`opentoplevel_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      32n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`descendant_open_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      64n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`descendant_toplevel_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      128n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`descendant_opentoplevel_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      256n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`child_open_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      512n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`child_toplevel_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      1024n,
    );
    expect(
      rolePermissionToBitmask(
        parseThreadPermissionString(`child_opentoplevel_know_of`),
      ),
    ).toBe(
      // $FlowIssue bigint-unsupported
      2048n,
    );
  });

  it('should fail to encode invalid variants of `know_of` as bitmask', () => {
    expect(() =>
      rolePermissionToBitmask(parseThreadPermissionString(`ancestor_know_of`)),
    ).toThrow('string is not threadPermissions enum');

    expect(() =>
      rolePermissionToBitmask(
        parseThreadPermissionString(`announcement_know_of`),
      ),
    ).toThrow('string is not threadPermissions enum');
  });
});

// TODO (atul): Update flow to `194.0.0` for bigint support
// $FlowIssue bigint-unsupported
describe('rolePermissionsToBitmaskHex', () => {
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

  it('size test', () => {
    const bitmask = rolePermissionsToBitmaskHex(permissions);
    expect(bitmask).toBe(
      '1001001001000001001001b20001001000001001001001001c7dc7d',
    );
  });
});
