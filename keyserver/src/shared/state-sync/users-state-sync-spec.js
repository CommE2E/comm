// @flow

import { usersStateSyncSpec as libSpec } from 'lib/shared/state-sync/users-state-sync-spec.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type { UserInfos, UserInfo } from 'lib/types/user-types.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchKnownUserInfos } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const usersStateSyncSpec: ServerStateSyncSpec<UserInfos, UserInfo> =
  Object.freeze({
    fetch(
      viewer: Viewer,
      query: $ReadOnlyArray<CalendarQuery>,
      ids?: $ReadOnlySet<string>,
    ) {
      if (ids) {
        return fetchKnownUserInfos(viewer, [...ids]);
      }

      return fetchKnownUserInfos(viewer);
    },
    ...libSpec,
  });
