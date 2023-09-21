// @flow

import type { StateSyncSpec } from 'lib/shared/state-sync/state-sync-spec.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { Viewer } from '../../session/viewer.js';

export type ServerStateSyncSpec<
  Infos,
  FullSocketSyncPayload,
  Info,
  Inconsistencies,
> = {
  +fetch: (viewer: Viewer, ids?: $ReadOnlySet<string>) => Promise<Infos>,
  +fetchFullSocketSyncPayload: (
    viewer: Viewer,
    calendarQuery: $ReadOnlyArray<CalendarQuery>,
  ) => Promise<FullSocketSyncPayload>,
  +fetchServerInfosHash: (
    viewer: Viewer,
    ids?: $ReadOnlySet<string>,
  ) => Promise<number>,
  +getServerInfosHash: (infos: Infos) => number,
  +getServerInfoHash: (info: Info) => number,
  ...StateSyncSpec<Infos, Info, Inconsistencies>,
};
