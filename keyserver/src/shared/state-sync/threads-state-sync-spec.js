// @flow

import { threadsStateSyncSpec as libSpec } from 'lib/shared/state-sync/threads-state-sync-spec.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import {
  fetchThreadInfos,
  type RawThreadInfos,
} from '../../fetchers/thread-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const threadsStateSyncSpec: ServerStateSyncSpec<RawThreadInfos> =
  Object.freeze({
    async fetch(
      viewer: Viewer,
      query: $ReadOnlyArray<CalendarQuery>,
      ids?: $ReadOnlySet<string>,
    ) {
      let result;
      if (ids) {
        result = await fetchThreadInfos(viewer, {
          threadIDs: ids,
        });
      } else {
        result = await fetchThreadInfos(viewer);
      }
      return result.threadInfos;
    },
    ...libSpec,
  });
