// @flow

import { usersStateSyncSpec as libSpec } from 'lib/shared/state-sync/users-state-sync-spec.js';
import type { ClientUserInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
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
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
> = Object.freeze({
  fetch,
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchKnownUserInfos(viewer);
    return values(result);
  },
  async fetchServerInfosHash(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const infos = await fetch(viewer, ids);
    return await getServerInfosHash(infos);
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

async function getServerInfosHash(infos: UserInfos) {
  const results = await Promise.all(values(infos).map(getServerInfoHash));
  return combineUnorderedHashes(results);
}

async function getServerInfoHash(info: UserInfo) {
  const output = await validateOutput(null, userInfoValidator, info);
  return hash(output);
}
