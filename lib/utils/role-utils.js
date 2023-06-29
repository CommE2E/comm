// @flow

import * as React from 'react';

import {
  type UserSurfacedPermissionOption,
  userSurfacedPermissions,
  userSurfacedPermissionOptions,
} from '../types/thread-permission-types.js';
import type { ThreadType } from '../types/thread-types-enum.js';
import { threadTypes } from '../types/thread-types-enum.js';

function useFilterPermissionOptionsByThreadType(
  threadType: ThreadType,
): $ReadOnlySet<UserSurfacedPermissionOption> {
  // If the thread is a community announcement root, we want to allow
  // the option to be voiced in the announcement channels. Otherwise,
  // we want to remove that option from being configured since this will
  // be guaranteed on the keyserver.
  const shouldFilterVoicedInAnnouncementChannel =
    threadType === threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT;

  return React.useMemo(() => {
    if (!shouldFilterVoicedInAnnouncementChannel) {
      return userSurfacedPermissionOptions;
    }

    return new Set(
      [...userSurfacedPermissionOptions].filter(
        option =>
          option.userSurfacedPermission !==
          userSurfacedPermissions.VOICED_IN_ANNOUNCEMENT_CHANNELS,
      ),
    );
  }, [shouldFilterVoicedInAnnouncementChannel]);
}

export { useFilterPermissionOptionsByThreadType };
