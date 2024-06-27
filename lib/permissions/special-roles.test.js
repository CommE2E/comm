// @flow

import {
  patchRawThreadInfosWithSpecialRole,
  patchRoleInfoWithSpecialRole,
  specialRoles,
} from './special-roles.js';
import type { RoleInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { RawThreadInfos } from '../types/thread-types.js';

describe('patchRoleInfoWithSpecialRole', () => {
  it('should correctly set DEFAULT_ROLE', () => {
    const role: RoleInfo = {
      minimallyEncoded: true,
      id: 'roleID',
      name: 'roleName',
      permissions: ['abc', 'def'],
      specialRole: specialRoles.DEFAULT_ROLE,
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
    };
    const patchedRole = patchRoleInfoWithSpecialRole(role);
    expect(patchedRole.specialRole).toBe(null);
  });
});

const rawThreadInfos: RawThreadInfos = {
  '256|1': {
    minimallyEncoded: true,
    id: '256|1',
    type: threadTypes.GENESIS,
    name: 'GENESIS',
    description:
      'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
    color: 'c85000',
    creationTime: 1702415956354,
    parentThreadID: null,
    containingThreadID: null,
    community: null,
    members: [
      {
        id: '256',
        role: '256|83796',
        isSender: false,
        minimallyEncoded: true,
      },
      {
        id: '83809',
        role: '256|83795',
        isSender: false,
        minimallyEncoded: true,
      },
    ],
    roles: {
      '256|83795': {
        id: '256|83795',
        name: 'Members',
        permissions: ['000', '010', '005', '015', '0a7'],
        minimallyEncoded: true,
        specialRole: specialRoles.DEFAULT_ROLE,
      },
      '256|83796': {
        id: '256|83796',
        name: 'Admins',
        permissions: [
          '000',
          '010',
          '020',
          '100',
          '110',
          '030',
          '040',
          '060',
          '050',
          '120',
          '080',
          '090',
          '0c0',
          '070',
          '0d0',
          '0e0',
          '130',
          '140',
          '150',
          '004',
          '014',
          '0a6',
          '0a8',
          '024',
          '034',
          '044',
          '064',
          '054',
          '124',
          '086',
          '096',
          '0c4',
          '074',
          '0b4',
          '0d4',
          '0e4',
          '134',
          '156',
        ],
        minimallyEncoded: true,
      },
    },
    currentUser: {
      role: '256|83795',
      permissions: '3',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
      minimallyEncoded: true,
    },
    repliesCount: 0,
    pinnedCount: 0,
  },
  '256|83814': {
    id: '256|83814',
    type: threadTypes.GENESIS_PRIVATE,
    name: '',
    description:
      'This is your private chat, where you can set reminders and jot notes in private!',
    color: 'aa4b4b',
    creationTime: 1702415964471,
    parentThreadID: '256|1',
    repliesCount: 0,
    containingThreadID: '256|1',
    community: '256|1',
    pinnedCount: 0,
    minimallyEncoded: true,
    members: [
      {
        id: '256',
        role: null,
        isSender: false,
        minimallyEncoded: true,
      },
      {
        id: '83809',
        role: '256|83815',
        isSender: true,
        minimallyEncoded: true,
      },
    ],
    roles: {
      '256|83815': {
        id: '256|83815',
        name: 'NotMembers',
        permissions: [
          '000',
          '010',
          '020',
          '100',
          '110',
          '060',
          '050',
          '090',
          '030',
          '005',
          '015',
          '0a9',
        ],
        minimallyEncoded: true,
      },
    },
    currentUser: {
      role: '256|83815',
      permissions: '3026f',
      subscription: {
        home: true,
        pushNotifs: true,
      },
      unread: false,
      minimallyEncoded: true,
    },
  },
};

describe('patchRawThreadInfosWithSpecialRole', () => {
  it('should correctly set special roles', () => {
    const patchedRawThreadInfos =
      patchRawThreadInfosWithSpecialRole(rawThreadInfos);

    expect(patchedRawThreadInfos['256|1'].roles['256|83795'].specialRole).toBe(
      specialRoles.DEFAULT_ROLE,
    );
    expect(patchedRawThreadInfos['256|1'].roles['256|83796'].specialRole).toBe(
      specialRoles.ADMIN_ROLE,
    );
    expect(
      patchedRawThreadInfos['256|83814'].roles['256|83815'].specialRole,
    ).toBe(null);
  });
});
