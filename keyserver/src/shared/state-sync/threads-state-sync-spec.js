// @flow

import { threadsStateSyncSpec as libSpec } from 'lib/shared/state-sync/threads-state-sync-spec.js';
import type { ClientThreadInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
import {
  type RawThreadInfos,
  type RawThreadInfo,
} from 'lib/types/thread-types.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import { fetchThreadInfos } from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const threadsStateSyncSpec: ServerStateSyncSpec<
  RawThreadInfos,
  RawThreadInfos,
  RawThreadInfo,
  $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
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
  ...libSpec,
});
