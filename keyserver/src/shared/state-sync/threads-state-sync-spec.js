// @flow

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const threadsStateSyncSpec: StateSyncSpec<FetchThreadInfosResult> =
  Object.freeze({
    fetchAll(viewer: Viewer) {
      return fetchThreadInfos(viewer);
    },
  });
