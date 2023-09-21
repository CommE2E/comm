// @flow

import type { StateSyncSpec } from 'lib/shared/state-sync/state-sync-spec.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { Viewer } from '../../session/viewer.js';

export type ServerStateSyncSpec<Infos, FullSocketSyncPayload, Info> = {
  +fetch: (viewer: Viewer, ids?: $ReadOnlySet<string>) => Promise<Infos>,
  +fetchFullSocketSyncPayload: (
    viewer: Viewer,
    calendarQuery: $ReadOnlyArray<CalendarQuery>,
  ) => Promise<FullSocketSyncPayload>,
  +getServerInfosHash: (infos: Infos) => number,
  +getServerInfoHash: (info: Info) => number,
  ...StateSyncSpec<Info>,
};
