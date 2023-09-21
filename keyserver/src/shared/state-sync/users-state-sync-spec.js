// @flow

import { usersStateSyncSpec as libSpec } from 'lib/shared/state-sync/users-state-sync-spec.js';
import type { UserInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
import type { UserInfos, UserInfo } from 'lib/types/user-types.js';
import { userInfoValidator } from 'lib/types/user-types.js';
import { values, hash, combineUnorderedHashes } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchKnownUserInfos } from '../../fetchers/user-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const usersStateSyncSpec: ServerStateSyncSpec<
  UserInfos,
  $ReadOnlyArray<UserInfo>,
  UserInfo,
  $ReadOnlyArray<UserInconsistencyReportCreationRequest>,
> = Object.freeze({
  fetch,
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchKnownUserInfos(viewer);
    return values(result);
  },
  async fetchServerInfosHash(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const infos = await fetch(viewer, ids);
    return getServerInfosHash(infos);
  },
  getServerInfosHash,
  getServerInfoHash,
  ...libSpec,
});

function fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
  if (ids) {
    return fetchKnownUserInfos(viewer, [...ids]);
  }

  return fetchKnownUserInfos(viewer);
}

function getServerInfosHash(infos: UserInfos) {
  return combineUnorderedHashes(values(infos).map(getServerInfoHash));
}

function getServerInfoHash(info: UserInfo) {
  return hash(validateOutput(null, userInfoValidator, info));
}
