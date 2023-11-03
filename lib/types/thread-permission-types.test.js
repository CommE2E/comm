// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import {
  configurableCommunityPermissions,
  universalCommunityPermissions,
  userSurfacedPermissions,
  threadPermissions,
} from './thread-permission-types.js';
import { getRolePermissionBlobs } from '../permissions/thread-permissions.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { values } from '../utils/objects.js';
import { toggleUserSurfacedPermission } from '../utils/role-utils.js';

describe('Community Announcement Root', () => {
  const { Members: membersPermissionBlob } = getRolePermissionBlobs(
    threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
  );

  it('should find Member permissions from getRolePermissionBlobs and user-surfaced permissions to be equal', () => {
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
      _isEqual(membersPermissionBlob, membersPermissionsConstructedBlob),
    ).toBe(true);
  });

  it('should find equal permission blobs when toggling user-surfaced permissions', () => {
    for (const userSurfacedPermission of values(userSurfacedPermissions)) {
      const firstTimeToggledPermissionSet = toggleUserSurfacedPermission(
        membersPermissionBlob,
        userSurfacedPermission,
      );
      const secondTimeToggledPermissionSet = toggleUserSurfacedPermission(
        firstTimeToggledPermissionSet,
        userSurfacedPermission,
      );

      expect(
        _isEqual(membersPermissionBlob, secondTimeToggledPermissionSet),
      ).toBe(true);
    }
  });
});

describe('Community Root', () => {
  const { Members: membersPermissionBlob } = getRolePermissionBlobs(
    threadTypes.COMMUNITY_ROOT,
  );

  it('should find Member permissions from getRolePermissionBlobs and user-surfaced permissions to be equal', () => {
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
      _isEqual(membersPermissionBlob, membersPermissionsConstructedBlob),
    ).toBe(true);
  });

  it('should find equal permission blobs when toggling user-surfaced permissions', () => {
    for (const userSurfacedPermission of values(userSurfacedPermissions)) {
      const firstTimeToggledPermissionSet = toggleUserSurfacedPermission(
        membersPermissionBlob,
        userSurfacedPermission,
      );
      const secondTimeToggledPermissionSet = toggleUserSurfacedPermission(
        firstTimeToggledPermissionSet,
        userSurfacedPermission,
      );

      expect(
        _isEqual(membersPermissionBlob, secondTimeToggledPermissionSet),
      ).toBe(true);
    }
  });
});
