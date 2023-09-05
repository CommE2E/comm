// @flow

import { usersStateSyncSpec as libSpec } from 'lib/shared/state-sync/users-state-sync-spec.js';
import type { UserInfos, UserInfo } from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchKnownUserInfos } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const usersStateSyncSpec: ServerStateSyncSpec<
  UserInfos,
  $ReadOnlyArray<UserInfo>,
  UserInfo,
> = Object.freeze({
  fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    if (ids) {
      return fetchKnownUserInfos(viewer, [...ids]);
    }

    return fetchKnownUserInfos(viewer);
  },
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchKnownUserInfos(viewer);
    return values(result);
  },
  ...libSpec,
});
