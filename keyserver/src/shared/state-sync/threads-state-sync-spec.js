// @flow

import { mixedThinRawThreadInfoValidator } from 'lib/permissions/minimally-encoded-raw-thread-info-validators.js';
import { threadsStateSyncSpec as libSpec } from 'lib/shared/state-sync/threads-state-sync-spec.js';
import type { RawThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ClientThreadInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
import {
  type MixedRawThreadInfos,
  type LegacyRawThreadInfo,
} from 'lib/types/thread-types.js';
import { hash, combineUnorderedHashes, values } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchThreadInfos } from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: ServerStateSyncSpec<
  MixedRawThreadInfos,
  MixedRawThreadInfos,
  LegacyRawThreadInfo | RawThreadInfo,
  $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
> = Object.freeze({
  fetch,
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchThreadInfos(viewer);
    return result.threadInfos;
  },
  async fetchServerInfosHash(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const infos = await fetch(viewer, ids);
    return await getServerInfosHash(infos);
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

async function getServerInfosHash(infos: MixedRawThreadInfos) {
  const results = await Promise.all(values(infos).map(getServerInfoHash));
  return combineUnorderedHashes(results);
}

async function getServerInfoHash(info: LegacyRawThreadInfo | RawThreadInfo) {
  const output = await validateOutput(
    null,
    mixedThinRawThreadInfoValidator,
    info,
  );
  return hash(output);
}
