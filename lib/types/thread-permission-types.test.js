// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import { userSurfacedPermissions } from './thread-permission-types.js';
import { getRolePermissionBlobs } from '../permissions/thread-permissions.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { values } from '../utils/objects.js';
import { toggleUserSurfacedPermission } from '../utils/role-utils.js';

describe('Community Announcement Root', () => {
  const { Members: membersPermissionBlob } = getRolePermissionBlobs(
    threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
  );

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
