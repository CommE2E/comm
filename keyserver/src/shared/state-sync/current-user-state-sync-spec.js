// @flow

import { currentUserStateSyncSpec as libSpec } from 'lib/shared/state-sync/current-user-state-sync-spec.js';
import type {
  CurrentUserInfo,
  OldCurrentUserInfo,
} from 'lib/types/user-types.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchCurrentUserInfo } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const currentUserStateSyncSpec: ServerStateSyncSpec<
  OldCurrentUserInfo | CurrentUserInfo,
  OldCurrentUserInfo | CurrentUserInfo,
> = Object.freeze({
  fetch(viewer: Viewer) {
    return fetchCurrentUserInfo(viewer);
  },
  fetchFullSocketSyncPayload(viewer: Viewer) {
    return fetchCurrentUserInfo(viewer);
  },
  ...libSpec,
});
