// @flow

import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  fetchThreadInfos,
  type RawThreadInfos,
} from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const threadsStateSyncSpec: StateSyncSpec<RawThreadInfos> =
  Object.freeze({
    async fetch(
      viewer: Viewer,
      query: $ReadOnlyArray<CalendarQuery>,
      ids?: $ReadOnlySet<string>,
    ) {
      const filter = ids ? { threadIDs: ids } : undefined;
      const result = await fetchThreadInfos(viewer, filter);
      return result.threadInfos;
    },
    hashKey: 'threadInfos',
    innerHashSpec: {
      hashKey: 'threadInfo',
      deleteKey: 'deleteThreadIDs',
      rawInfosKey: 'rawThreadInfos',
    },
  });
