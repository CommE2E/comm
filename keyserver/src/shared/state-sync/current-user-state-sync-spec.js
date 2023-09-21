// @flow

import { currentUserStateSyncSpec as libSpec } from 'lib/shared/state-sync/current-user-state-sync-spec.js';
import type { CurrentUserInfo } from 'lib/types/user-types.js';
import { currentUserInfoValidator } from 'lib/types/user-types.js';
import { hash } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchCurrentUserInfo } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const currentUserStateSyncSpec: ServerStateSyncSpec<
  CurrentUserInfo,
  CurrentUserInfo,
  CurrentUserInfo,
  void,
> = Object.freeze({
  fetch,
  fetchFullSocketSyncPayload(viewer: Viewer) {
    return fetchCurrentUserInfo(viewer);
  },
  async fetchServerInfosHash(viewer: Viewer) {
    const info = await fetch(viewer);
    return getHash(info);
  },
  getServerInfosHash: getHash,
  getServerInfoHash: getHash,
  ...libSpec,
});

function fetch(viewer: Viewer) {
  return fetchCurrentUserInfo(viewer);
}

function getHash(currentUserInfo: CurrentUserInfo) {
  return hash(validateOutput(null, currentUserInfoValidator, currentUserInfo));
}
