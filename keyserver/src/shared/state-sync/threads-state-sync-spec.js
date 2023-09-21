// @flow

import { threadsStateSyncSpec as libSpec } from 'lib/shared/state-sync/threads-state-sync-spec.js';
import {
  type RawThreadInfos,
  type RawThreadInfo,
  rawThreadInfoValidator,
} from 'lib/types/thread-types.js';
import { hash, combineUnorderedHashes, values } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchThreadInfos } from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: ServerStateSyncSpec<
  RawThreadInfos,
  RawThreadInfos,
  RawThreadInfo,
> = Object.freeze({
  async fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const filter = ids ? { threadIDs: ids } : undefined;
    const result = await fetchThreadInfos(viewer, filter);
    return result.threadInfos;
  },
  async fetchFullSocketSyncPayload(viewer: Viewer) {
    const result = await fetchThreadInfos(viewer);
    return result.threadInfos;
  },
  getServerInfosHash(infos: RawThreadInfos) {
    return combineUnorderedHashes(values(infos).map(getServerInfoHash));
  },
  getServerInfoHash,
  ...libSpec,
});

function getServerInfoHash(info: RawThreadInfo) {
  return hash(validateOutput(null, rawThreadInfoValidator, info));
}
