// @flow

import {
  configurableCommunityPermissions,
  universalCommunityPermissions,
  userSurfacedPermissions,
  threadPermissions,
} from './thread-permission-types.js';
import { getRolePermissionBlobs } from '../permissions/thread-permissions.js';
import { threadTypes } from '../types/thread-types-enum.js';
import { deepDiff, values } from '../utils/objects.js';

const getUniversalCommunityPermissionsBlob = () =>
  Object.fromEntries(
    universalCommunityPermissions.map(permission => [permission, true]),
  );

const addAllUniversalCommunityPermissions = (
  permissionsBlob,
  universalBlob,
) => ({
  ...permissionsBlob,
  ...universalBlob,
});

const addAllConfigurableCommunityPermissions = permissionsBlob => ({
  ...permissionsBlob,
  ...Object.fromEntries(
    values(configurableCommunityPermissions).flatMap(permissions =>
      [...permissions].map(permission => [permission, true]),
    ),
  ),
});

const removeAllConfigurableCommunityPermissions = permissionsBlob => {
  const allConfigurableCommunityPermissions = values(
    configurableCommunityPermissions,
  ).flatMap(permissions => [...permissions]);

  return Object.fromEntries(
    Object.entries(permissionsBlob).filter(
      ([key]) => !allConfigurableCommunityPermissions.includes(key),
    ),
  );
};

const reconstructOriginalPermissionsBlob = (
  permissionsBlob,
  permissionsToAdd,
) => ({
  ...permissionsBlob,
  ...Object.fromEntries(permissionsToAdd.map(permission => [permission, true])),
});

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
    expect(
      deepDiff(membersPermissionsConstructedBlob, membersPermissionBlob),
    ).toEqual({});
  });

  it('should find Member permissions to be equal before and after adding permissions', () => {
    const { Members: membersPermissionBlob } = getRolePermissionBlobs(
      threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT,
    );
    const universalCommunityPermissionsBlob =
      getUniversalCommunityPermissionsBlob();

    const constructedMembersPermissionsBlob = membersPermissionBlob;
    expect(
      deepDiff(constructedMembersPermissionsBlob, membersPermissionBlob),
    ).toEqual({});

    // Add all universal community permissions
    const constructedBlobWithUniversalPermissions =
      addAllUniversalCommunityPermissions(
        constructedMembersPermissionsBlob,
        universalCommunityPermissionsBlob,
      );
    expect(
      deepDiff(constructedBlobWithUniversalPermissions, membersPermissionBlob),
    ).toEqual({});

    // Add all configurable community permissions.
    const constructedBlobWithConfigurablePermissions =
      addAllConfigurableCommunityPermissions(
        constructedBlobWithUniversalPermissions,
      );

    // Remove all configurable community permissions
    const constructedBlobWithoutConfigurablePermissions =
      removeAllConfigurableCommunityPermissions(
        constructedBlobWithConfigurablePermissions,
      );

    expect(
      deepDiff(
        constructedBlobWithoutConfigurablePermissions,
        universalCommunityPermissionsBlob,
      ),
    ).toEqual({});

    // Add the original user-surfaced permissions back to the Members blob
    const originalUserSurfacedPermissions = [
      ...configurableCommunityPermissions[userSurfacedPermissions.ADD_MEMBERS],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.REACT_TO_MESSAGES
      ],
      ...configurableCommunityPermissions[
        userSurfacedPermissions.EDIT_MESSAGES
      ],
    ];

    const reconstructedBlob = reconstructOriginalPermissionsBlob(
      constructedBlobWithoutConfigurablePermissions,
      originalUserSurfacedPermissions,
    );

    expect(deepDiff(reconstructedBlob, membersPermissionBlob)).toEqual({});
    expect(deepDiff(membersPermissionBlob, reconstructedBlob)).toEqual({});
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
    expect(
      deepDiff(membersPermissionsConstructedBlob, membersPermissionBlob),
    ).toEqual({});
  });

  it('should find Member permissions to be equal before and after adding permissions', () => {
    const { Members: membersPermissionBlob } = getRolePermissionBlobs(
      threadTypes.COMMUNITY_ROOT,
    );
    const universalCommunityPermissionsBlob =
      getUniversalCommunityPermissionsBlob();

    const constructedMembersPermissionsBlob = membersPermissionBlob;
    expect(
      deepDiff(constructedMembersPermissionsBlob, membersPermissionBlob),
    ).toEqual({});

    // Add all universal community permissions
    const constructedBlobWithUniversalPermissions =
      addAllUniversalCommunityPermissions(
        constructedMembersPermissionsBlob,
        universalCommunityPermissionsBlob,
      );
    expect(
      deepDiff(constructedBlobWithUniversalPermissions, membersPermissionBlob),
    ).toEqual({});

    // Add all configurable community permissions.
    const constructedBlobWithConfigurablePermissions =
      addAllConfigurableCommunityPermissions(
        constructedBlobWithUniversalPermissions,
      );

    // Remove all configurable community permissions
    const constructedBlobWithoutConfigurablePermissions =
      removeAllConfigurableCommunityPermissions(
        constructedBlobWithConfigurablePermissions,
      );

    expect(
      deepDiff(
        constructedBlobWithoutConfigurablePermissions,
        universalCommunityPermissionsBlob,
      ),
    ).toEqual({});

    // Add the original user-surfaced permissions back to the Members blob
    const originalUserSurfacedPermissions = [
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
    ];

    const reconstructedBlob = reconstructOriginalPermissionsBlob(
      constructedBlobWithoutConfigurablePermissions,
      originalUserSurfacedPermissions,
    );
    reconstructedBlob[threadPermissions.VOICED] = true;

    expect(deepDiff(reconstructedBlob, membersPermissionBlob)).toEqual({});
    expect(deepDiff(membersPermissionBlob, reconstructedBlob)).toEqual({});
  });
});
