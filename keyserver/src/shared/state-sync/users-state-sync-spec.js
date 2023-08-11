// @flow

import type { UserInfos } from 'lib/types/user-types.js';

import type { StateSyncSpec } from './state-sync-spec.js';
import { fetchKnownUserInfos } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const usersStateSyncSpec: StateSyncSpec<UserInfos> = Object.freeze({
  fetchAll(viewer: Viewer) {
    return fetchKnownUserInfos(viewer);
  },
});
