// @flow

import {
  configurableCommunityPermissions,
  universalCommunityPermissions,
  userSurfacedPermissions,
  type UserSurfacedPermission,
  threadPermissions,
} from './thread-permission-types.js';
import { getRolePermissionBlobs } from '../permissions/thread-permissions.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { deepDiff, values } from '../utils/objects.js';

describe('Community Announcement Root', () => {
  it('should find Member permissions from getRolePermissionBlobs and user-surfaced permissions to be equal', () => {
    const { Members: membersPermissionBlob } = getRolePermissionBlobs(
      threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    );

    const membersPermissionsConstructed = [
      ...configurableCommunityPermissions[userSurfacedPermissions.ADD_MEMBERS],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.REACT_TO_MESSAGES
      ],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.EDIT_MESSAGES
      ],
      ...universalCommunityPermissions,
    ];
    const membersPermissionsConstructedBlob = Object.fromEntries(
      membersPermissionsConstructed.map(permission => [permission, true]),
    );

    expect(
      deepDiff(membersPermissionBlob, membersPermissionsConstructedBlob),
    ).toEqual({});
  });

  it('should find Admin permissions from getRolePermissionBlobs and user-surfaced permissions to be equal', () => {
    const adminsPermissionBlob =
      getRolePermissionBlobs(threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT).Admins ??
      {};

    const adminsPermissionsConstructed = [
      ...values(userSurfacedPermissions)
        .map((permission: UserSurfacedPermission) => [
          ...configurableCommunityPermissions[permission],
        ])
        .flat(),
      ...universalCommunityPermissions,
    ];

    const adminsPermissionsConstructedBlob = Object.fromEntries(
      adminsPermissionsConstructed.map(permission => [permission, true]),
    );

    // Context in: [D8391](https://phab.comm.dev/D8391). Essentially, we don't
    // propagate the descendant_voiced permission string literal.  This is
    // because for those who have the ability to see secret channels, if they
    // just have voiced permissions, they can bypass needing to join the thread
    // and can just start speaking. Adding this permission means they will have
    //  to first join, then they will have the ability to be voiced.
    expect(
      deepDiff(adminsPermissionBlob, adminsPermissionsConstructedBlob),
    ).toEqual({ descendant_voiced: true });
  });
});

describe('Community Root', () => {
  it('should find Member permissions from getRolePermissionBlobs and user-surfaced permissions to be equal', () => {
    const { Members: membersPermissionBlob } = getRolePermissionBlobs(
      threadTypes.COMMUNITY_ROOT,
    );

    const membersPermissionsConstructed = [
      ...configurableCommunityPermissions[userSurfacedPermissions.ADD_MEMBERS],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.REACT_TO_MESSAGES
      ],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.EDIT_MESSAGES
      ],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.CREATE_AND_EDIT_CHANNELS
      ],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.EDIT_CALENDAR
      ],
      threadPermissions.VOICED,
      ...universalCommunityPermissions,
    ];
    const membersPermissionsConstructedBlob = Object.fromEntries(
      membersPermissionsConstructed.map(permission => [permission, true]),
    );

    expect(
      deepDiff(membersPermissionBlob, membersPermissionsConstructedBlob),
    ).toEqual({});
  });
});
