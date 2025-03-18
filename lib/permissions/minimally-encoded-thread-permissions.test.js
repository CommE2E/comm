// @flow

import {
  memberInfoWithPermissionsValidator,
  persistedRoleInfoValidator,
  thinRawThreadInfoValidator,
  roleInfoValidator,
  threadCurrentUserInfoValidator,
} from './minimally-encoded-raw-thread-info-validators.js';
import {
  exampleMinimallyEncodedRawThreadInfoA,
  exampleRawThreadInfoA,
  expectedDecodedExampleRawThreadInfoA,
} from './minimally-encoded-thread-permissions-test-data.js';
import {
  decodeRolePermissionBitmask,
  decodeThreadRolePermissionsBitmaskArray,
  hasPermission,
  permissionsToBitmaskHex,
  rolePermissionToBitmaskHex,
  threadPermissionsFromBitmaskHex,
  threadRolePermissionsBlobToBitmaskArray,
} from './minimally-encoded-thread-permissions.js';
import { specialRoles } from './special-roles.js';
import {
  minimallyEncodeRawThreadInfoWithMemberPermissions,
  deprecatedDecodeMinimallyEncodedRawThreadInfo,
  minimallyEncodeThreadCurrentUserInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { ThreadRolePermissionsBlob } from '../types/thread-permission-types.js';
import type { LegacyThreadCurrentUserInfo } from '../types/thread-types.js';

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
  edit_thread_avatar: { value: false, source: null },
  manage_pins: { value: false, source: null },
  manage_invite_links: { value: false, source: null },
  voiced_in_announcement_channels: { value: false, source: null },
  manage_farcaster_channel_tags: { value: false, source: null },
  delete_own_messages: { value: false, source: null },
  delete_all_messages: { value: false, source: null },
};

describe('minimallyEncodedThreadPermissions', () => {
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

describe('hasPermission', () => {
  const permissionsSansKnowOf = {
    know_of: { value: false, source: null },
    visible: { value: true, source: '1' },
  };
  const permissionsSansKnowOfBitmask = permissionsToBitmaskHex(
    permissionsSansKnowOf,
  );
  it('should fail check if know_of is false even if permission specified in request is true', () => {
    expect(hasPermission(permissionsSansKnowOfBitmask, 'visible')).toBe(false);
  });

  const permissionsWithKnowOf = {
    know_of: { value: true, source: '1' },
    visible: { value: true, source: '1' },
  };
  const permissionsWithKnowOfBitmask = permissionsToBitmaskHex(
    permissionsWithKnowOf,
  );
  it('should succeed permission check if know_of is true', () => {
    expect(hasPermission(permissionsWithKnowOfBitmask, 'visible')).toBe(true);
  });
});

describe('threadPermissionsFromBitmaskHex', () => {
  const expectedDecodedThreadPermissions = {
    know_of: { value: true, source: 'null' },
    visible: { value: true, source: 'null' },
    voiced: { value: true, source: 'null' },
    edit_entries: { value: true, source: 'null' },
    edit_thread: { value: true, source: 'null' },
    edit_thread_description: { value: true, source: 'null' },
    edit_thread_color: { value: true, source: 'null' },
    delete_thread: { value: true, source: 'null' },
    create_subthreads: { value: true, source: 'null' },
    create_sidebars: { value: true, source: 'null' },
    join_thread: { value: false, source: null },
    edit_permissions: { value: false, source: null },
    add_members: { value: true, source: 'null' },
    remove_members: { value: true, source: 'null' },
    change_role: { value: true, source: 'null' },
    leave_thread: { value: false, source: null },
    react_to_message: { value: true, source: 'null' },
    edit_message: { value: true, source: 'null' },
    edit_thread_avatar: { value: false, source: null },
    manage_pins: { value: false, source: null },
    manage_invite_links: { value: false, source: null },
    voiced_in_announcement_channels: { value: false, source: null },
    manage_farcaster_channel_tags: { value: false, source: null },
    delete_own_messages: { value: false, source: null },
    delete_all_messages: { value: false, source: null },
  };

  it('should decode ThreadPermissionsInfo from bitmask', () => {
    const permissionsBitmask = permissionsToBitmaskHex(permissions);
    const decodedThreadPermissions =
      threadPermissionsFromBitmaskHex(permissionsBitmask);

    expect(decodedThreadPermissions).toStrictEqual(
      expectedDecodedThreadPermissions,
    );
  });

  it('should decode bitmask strings under 3 characters', () => {
    // We know that '3' in hex is 0b0011. Given that permissions are encoded
    // from least significant bit (LSB) to most significant bit (MSB), we would
    // except this to mean that only the first two permissions listed in
    // `baseRolePermissionEncoding` are `true`. Which is the case.
    const decodedThreadPermissions = threadPermissionsFromBitmaskHex('3');
    expect(decodedThreadPermissions).toStrictEqual({
      know_of: { value: true, source: 'null' },
      visible: { value: true, source: 'null' },
      voiced: { value: false, source: null },
      edit_entries: { value: false, source: null },
      edit_thread: { value: false, source: null },
      edit_thread_description: { value: false, source: null },
      edit_thread_color: { value: false, source: null },
      delete_thread: { value: false, source: null },
      create_subthreads: { value: false, source: null },
      create_sidebars: { value: false, source: null },
      join_thread: { value: false, source: null },
      edit_permissions: { value: false, source: null },
      add_members: { value: false, source: null },
      remove_members: { value: false, source: null },
      change_role: { value: false, source: null },
      leave_thread: { value: false, source: null },
      react_to_message: { value: false, source: null },
      edit_message: { value: false, source: null },
      edit_thread_avatar: { value: false, source: null },
      manage_pins: { value: false, source: null },
      manage_invite_links: { value: false, source: null },
      voiced_in_announcement_channels: { value: false, source: null },
      manage_farcaster_channel_tags: { value: false, source: null },
      delete_own_messages: { value: false, source: null },
      delete_all_messages: { value: false, source: null },
    });
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

const threadRolePermissionsBlob: ThreadRolePermissionsBlob = {
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

const threadRolePermissionsBitmaskArray = [
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
];

describe('threadRolePermissionsBlobToBitmaskArray', () => {
  it('should encode threadRolePermissionsBlob as bitmask array', () => {
    const arr = threadRolePermissionsBlobToBitmaskArray(
      threadRolePermissionsBlob,
    );
    expect(arr).toEqual(threadRolePermissionsBitmaskArray);
  });
});

describe('decodeThreadRolePermissionsBitmaskArray', () => {
  it('should decode threadRolePermissionsBitmaskArray', () => {
    expect(
      decodeThreadRolePermissionsBitmaskArray(
        threadRolePermissionsBitmaskArray,
      ),
    ).toEqual(threadRolePermissionsBlob);
  });
});

describe('minimallyEncodedRoleInfoValidator', () => {
  it('should validate correctly formed MinimallyEncodedRoleInfo', () => {
    expect(
      roleInfoValidator.is({
        minimallyEncoded: true,
        id: 'roleID',
        name: 'roleName',
        permissions: ['abc', 'def'],
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(true);
  });

  it('should NOT validate malformed MinimallyEncodedRoleInfo', () => {
    expect(
      roleInfoValidator.is({
        id: 1234,
        name: 'roleName',
        permissions: ['abc', 'def'],
        isDefault: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(false);

    expect(
      roleInfoValidator.is({
        id: 'roleID',
        name: 'roleName',
        permissions: ['hello a02 test', 'def'],
        isDefault: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(false);

    expect(
      roleInfoValidator.is({
        id: 'roleID',
        name: 'roleName',
        permissions: [123, 456],
        isDefault: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(false);

    expect(
      roleInfoValidator.is({
        id: 'roleID',
        name: 'roleName',
        permissions: ['ZZZ', 'YYY'],
        isDefault: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(false);

    expect(
      roleInfoValidator.is({
        id: 'roleID',
        name: 'roleName',
        permissions: ['AAAAA', 'YYY'],
        isDefault: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      }),
    ).toBe(false);
  });
});

describe('persistedRoleInfoValidator', () => {
  it('should validate persisted RoleInfo with isDefault field', () => {
    expect(
      persistedRoleInfoValidator.is({
        minimallyEncoded: true,
        id: 'roleID',
        name: 'roleName',
        permissions: ['abc', 'def'],
        specialRole: specialRoles.DEFAULT_ROLE,
        isDefault: true,
      }),
    ).toBe(true);
  });
});

describe('minimallyEncodedThreadCurrentUserInfoValidator', () => {
  it('should validate correctly formed MinimallyEncodedThreadCurrentUserInfo', () => {
    expect(
      threadCurrentUserInfoValidator.is({
        minimallyEncoded: true,
        permissions: '100',
        subscription: { home: true, pushNotifs: true },
      }),
    ).toBe(true);
    expect(
      threadCurrentUserInfoValidator.is({
        minimallyEncoded: true,
        permissions: 'ABCDEFABCDEFABCD',
        subscription: { home: true, pushNotifs: true },
      }),
    ).toBe(true);
  });

  it('should NOT validate malformed MinimallyEncodedThreadCurrentUserInfo', () => {
    expect(
      threadCurrentUserInfoValidator.is({
        minimallyEncoded: true,
        permissions: 'INVALID',
        subscription: { home: true, pushNotifs: true },
      }),
    ).toBe(false);

    expect(
      threadCurrentUserInfoValidator.is({
        minimallyEncoded: true,
        permissions: 'ABCDEF  hello  ABCDEFABCD',
        subscription: { home: true, pushNotifs: true },
      }),
    ).toBe(false);

    expect(
      threadCurrentUserInfoValidator.is({
        minimallyEncoded: true,
        permissions: 100,
        subscription: { home: true, pushNotifs: true },
      }),
    ).toBe(false);
  });
});

describe('minimallyEncodedMemberInfoValidator', () => {
  it('should validate correctly formed MinimallyEncodedMemberInfo', () => {
    expect(
      memberInfoWithPermissionsValidator.is({
        minimallyEncoded: true,
        id: 'memberID',
        permissions: 'ABCDEF',
        isSender: true,
      }),
    ).toBe(true);

    expect(
      memberInfoWithPermissionsValidator.is({
        minimallyEncoded: true,
        id: 'memberID',
        permissions: '01b',
        isSender: false,
      }),
    ).toBe(true);
  });

  it('should NOT validate malformed MinimallyEncodedMemberInfo', () => {
    expect(
      memberInfoWithPermissionsValidator.is({
        minimallyEncoded: true,
        id: 'memberID',
        permissions: 'INVALID',
        isSender: false,
      }),
    ).toBe(false);

    expect(
      memberInfoWithPermissionsValidator.is({
        minimallyEncoded: true,
        id: 'memberID',
        permissions: 100,
        isSender: false,
      }),
    ).toBe(false);
  });
});

describe('minimallyEncodedRawThreadInfoValidator', () => {
  it('should validate correctly formed MinimallyEncodedRawThreadInfo', () => {
    expect(
      thinRawThreadInfoValidator.is(exampleMinimallyEncodedRawThreadInfoA),
    ).toBe(true);
  });
});

describe('minimallyEncodeRawThreadInfo', () => {
  it('should correctly encode RawThreadInfo', () => {
    expect(
      thinRawThreadInfoValidator.is(
        minimallyEncodeRawThreadInfoWithMemberPermissions(
          exampleRawThreadInfoA,
        ),
      ),
    ).toBe(true);
  });
});

describe('decodeMinimallyEncodedRawThreadInfo', () => {
  it('should correctly decode minimallyEncodedRawThreadInfo', () => {
    expect(
      deprecatedDecodeMinimallyEncodedRawThreadInfo(
        minimallyEncodeRawThreadInfoWithMemberPermissions(
          exampleRawThreadInfoA,
        ),
      ),
    ).toStrictEqual(expectedDecodedExampleRawThreadInfoA);
  });
});

const threadCurrentUserInfo: LegacyThreadCurrentUserInfo = {
  role: '256|83795',
  permissions: {
    know_of: {
      value: true,
      source: '256|1',
    },
    visible: {
      value: true,
      source: '256|1',
    },
    voiced: {
      value: false,
      source: null,
    },
    edit_entries: {
      value: false,
      source: null,
    },
    edit_thread: {
      value: false,
      source: null,
    },
    edit_thread_description: {
      value: false,
      source: null,
    },
    edit_thread_color: {
      value: false,
      source: null,
    },
    delete_thread: {
      value: false,
      source: null,
    },
    create_subthreads: {
      value: false,
      source: null,
    },
    create_sidebars: {
      value: false,
      source: null,
    },
    join_thread: {
      value: false,
      source: null,
    },
    edit_permissions: {
      value: false,
      source: null,
    },
    add_members: {
      value: false,
      source: null,
    },
    remove_members: {
      value: false,
      source: null,
    },
    change_role: {
      value: false,
      source: null,
    },
    leave_thread: {
      value: false,
      source: null,
    },
    react_to_message: {
      value: false,
      source: null,
    },
    edit_message: {
      value: false,
      source: null,
    },
    edit_thread_avatar: {
      value: false,
      source: null,
    },
    manage_pins: {
      value: false,
      source: null,
    },
    manage_invite_links: {
      value: false,
      source: null,
    },
    voiced_in_announcement_channels: {
      value: false,
      source: null,
    },
    manage_farcaster_channel_tags: {
      value: false,
      source: null,
    },
    delete_own_messages: {
      value: false,
      source: null,
    },
    delete_all_messages: {
      value: false,
      source: null,
    },
  },
  subscription: {
    home: true,
    pushNotifs: true,
  },
  unread: true,
};
describe('minimallyEncodeThreadCurrentUserInfo', () => {
  it('should correctly encode threadCurrentUserInfo ONCE', () => {
    const minimallyEncoded = minimallyEncodeThreadCurrentUserInfo(
      threadCurrentUserInfo,
    );
    expect(minimallyEncoded.permissions).toBe('3');
  });

  it('should throw when attempting to minimally encode threadCurrentUserInfo twice', () => {
    const minimallyEncoded = minimallyEncodeThreadCurrentUserInfo(
      threadCurrentUserInfo,
    );
    expect(minimallyEncoded.permissions).toBe('3');
    expect(() =>
      // `MinimallyEncodedThreadCurrentUser` should never be passed
      // to `minimallyEncodeThreadCurrentUserInfo`. We're intentionally
      // bypassing Flow to simulate a scenario where malformed input is
      // passed to minimallyEncodeThreadCurrentUserInfo to ensure that the
      // `invariant` throws the expected error.

      // $FlowExpectedError
      minimallyEncodeThreadCurrentUserInfo(minimallyEncoded),
    ).toThrow('threadCurrentUserInfo is already minimally encoded.');
  });
});
