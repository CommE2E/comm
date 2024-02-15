// @flow

import { serverEntryInfosObject } from 'lib/shared/entry-utils.js';
import { entriesStateSyncSpec as libSpec } from 'lib/shared/state-sync/entries-state-sync-spec.js';
import {
  type CalendarQuery,
  type RawEntryInfo,
  type RawEntryInfos,
  rawEntryInfoValidator,
} from 'lib/types/entry-types.js';
import type { ClientEntryInconsistencyReportCreationRequest } from 'lib/types/report-types.js';
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
  $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>,
> = Object.freeze({
  fetch,
  async fetchFullSocketSyncPayload(
    viewer: Viewer,
    query: $ReadOnlyArray<CalendarQuery>,
  ) {
    const result = await fetchEntryInfos(viewer, query);
    return result.rawEntryInfos;
  },
  async fetchServerInfosHash(viewer: Viewer, ids?: $ReadOnlySet<string>) {
    const info = await fetch(viewer, ids);
    return await getServerInfosHash(info);
  },
  getServerInfosHash,
  getServerInfoHash,
  ...libSpec,
});

async function fetch(viewer: Viewer, ids?: $ReadOnlySet<string>) {
  if (ids) {
    return fetchEntryInfosByID(viewer, ids);
  }
  const query = [viewer.calendarQuery];
  const entriesResult = await fetchEntryInfos(viewer, query);
  return serverEntryInfosObject(entriesResult.rawEntryInfos);
}

async function getServerInfosHash(infos: RawEntryInfos) {
  const results = await Promise.all(values(infos).map(getServerInfoHash));
  return combineUnorderedHashes(results);
}

async function getServerInfoHash(info: RawEntryInfo) {
  const output = await validateOutput(null, rawEntryInfoValidator, info);
  return hash(output);
}
