// @flow

import { serverEntryInfosObject } from 'lib/shared/entry-utils.js';
import { entriesStateSyncSpec as libSpec } from 'lib/shared/state-sync/entries-state-sync-spec.js';
import type { CalendarQuery, RawEntryInfos } from 'lib/types/entry-types.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import {
  fetchEntryInfos,
  fetchEntryInfosByID,
} from '../../fetchers/entry-fetchers.js';
import type { Viewer } from '../../session/viewer.js';

export const entriesStateSyncSpec: ServerStateSyncSpec<RawEntryInfos> =
  Object.freeze({
    async fetch(
      viewer: Viewer,
      query: $ReadOnlyArray<CalendarQuery>,
      ids?: $ReadOnlySet<string>,
    ) {
      if (ids) {
        return fetchEntryInfosByID(viewer, ids);
      }
      const entriesResult = await fetchEntryInfos(viewer, query);
      return serverEntryInfosObject(entriesResult.rawEntryInfos);
    },
    ...libSpec,
  });
