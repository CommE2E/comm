// @flow

import { serverEntryInfosObject } from 'lib/shared/entry-utils.js';
import { entriesStateSyncSpec as libSpec } from 'lib/shared/state-sync/entries-state-sync-spec.js';
import {
  type CalendarQuery,
  type RawEntryInfo,
  type RawEntryInfos,
  rawEntryInfoValidator,
} from 'lib/types/entry-types.js';
import { hash, combineUnorderedHashes, values } from 'lib/utils/objects.js';

import type { ServerStateSyncSpec } from './state-sync-spec.js';
import {
  fetchEntryInfos,
  fetchEntryInfosByID,
} from '../../fetchers/entry-fetchers.js';
import type { Viewer } from '../../session/viewer.js';
import { validateOutput } from '../../utils/validation-utils.js';

export const entriesStateSyncSpec: ServerStateSyncSpec<
  RawEntryInfos,
  $ReadOnlyArray<RawEntryInfo>,
  RawEntryInfo,
> = Object.freeze({
  async fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    if (ids) {
      return fetchEntryInfosByID(viewer, ids);
    }
    const query = [viewer.calendarQuery];
    const entriesResult = await fetchEntryInfos(viewer, query);
    return serverEntryInfosObject(entriesResult.rawEntryInfos);
  },
  async fetchFullSocketSyncPayload(
    viewer: Viewer,
    query: $ReadOnlyArray<CalendarQuery>,
  ) {
    const result = await fetchEntryInfos(viewer, query);
    return result.rawEntryInfos;
  },
  getServerInfosHash(infos: RawEntryInfos) {
    return combineUnorderedHashes(values(infos).map(getServerInfoHash));
  },
  getServerInfoHash,
  ...libSpec,
});

function getServerInfoHash(info: RawEntryInfo) {
  return hash(validateOutput(null, rawEntryInfoValidator, info));
}
