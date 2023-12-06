// @flow

import { rawThreadInfoValidator } from 'lib/permissions/minimally-encoded-thread-permissions-validators.js';
import { threadsStateSyncSpec as libSpec } from 'lib/shared/state-sync/threads-state-sync-spec.js';
import type { ClientThreadInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
import {
  type LegacyRawThreadInfos,
  type LegacyRawThreadInfo,
  type RawThreadInfo,
  type RawThreadInfos,
} from 'lib/types/thread-types.js';
import { hash, combineUnorderedHashes, values } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchThreadInfos } from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: ServerStateSyncSpec<
  LegacyRawThreadInfos,
  LegacyRawThreadInfos,
  LegacyRawThreadInfo,
  $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
> = Object.freeze({
  fetch,
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchThreadInfos(viewer);
    return result.threadInfos;
  },
  async fetchServerInfosHash(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const infos = await fetch(viewer, ids);
    return getServerInfosHash(infos);
  },
  getServerInfosHash,
  getServerInfoHash,
  ...libSpec,
});

async function fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
  const filter = ids ? { threadIDs: ids } : undefined;
  const result = await fetchThreadInfos(viewer, filter);
  return result.threadInfos;
}

function getServerInfosHash(infos: RawThreadInfos) {
  return combineUnorderedHashes(values(infos).map(getServerInfoHash));
}

function getServerInfoHash(info: RawThreadInfo) {
  return hash(validateOutput(null, rawThreadInfoValidator, info));
}
