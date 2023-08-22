// @flow

import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  fetchThreadInfos,
  type FetchThreadInfosResult,
} from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const threadsStateSyncSpec: StateSyncSpec<FetchThreadInfosResult> =
  Object.freeze({
    fetch(
      viewer: Viewer,
      query: $ReadOnlyArray<CalendarQuery>,
      ids?: $ReadOnlySet<string>,
    ) {
      if (ids) {
        return fetchThreadInfos(viewer, {
          threadIDs: ids,
        });
      }
      return fetchThreadInfos(viewer);
    },
  });
