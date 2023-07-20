// @flow

import {
  type UserSurfacedPermissionOption,
  userSurfacedPermissionOptions,
  userSurfacedPermissions,
} from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

export type ModifiedUserSurfacedPermissionOption = {
  ...UserSurfacedPermissionOption,
  statements: $ReadOnlyArray<{
    +statement: string,
    +isStatementValid: boolean,
    +styleStatementBasedOnValidity: boolean,
  }>,
};
function modifyUserSurfacedPermissionOptions(
  threadInfo: ThreadInfo,
): $ReadOnlyArray<ModifiedUserSurfacedPermissionOption> {
  // If the thread is a community announcement root, we want to allow
  // the option to be voiced in the announcement channels. Otherwise,
  // we want to remove that option from being configured since this will
  // be guaranteed on the keyserver.
  const filteredOptions =
    threadInfo.type === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT
      ? userSurfacedPermissionOptions
      : [...userSurfacedPermissionOptions].filter(
          option =>
            option.userSurfacedPermission !==
            userSurfacedPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
        );

  // EnumSettingsOption on web requires a statements array, and since this
  // is web-specific rather than cross-platform, we should handle this
  // here and modify the options to include a statement.
  const modifiedOptions = [...filteredOptions].map(option => {
    return {
      ...option,
      statements: [
        {
          statement: option.description,
          isStatementValid: true,
          styleStatementBasedOnValidity: false,
        },
      ],
    };
  });

  return modifiedOptions;
}

export { modifyUserSurfacedPermissionOptions };
