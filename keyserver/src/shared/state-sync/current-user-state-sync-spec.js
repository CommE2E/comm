// @flow

import type {
  CurrentUserInfo,
  OldCurrentUserInfo,
} from 'lib/types/user-types.js';

import type { StateSyncSpec } from './state-sync-spec.js';
import { fetchCurrentUserInfo } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const currentUserStateSyncSpec: StateSyncSpec<
  OldCurrentUserInfo | CurrentUserInfo,
> = Object.freeze({
  fetch(viewer: Viewer) {
    return fetchCurrentUserInfo(viewer);
  },
  hashKey: 'currentUserInfo',
});
