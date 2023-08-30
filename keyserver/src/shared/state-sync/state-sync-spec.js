// @flow

import type { StateSyncSpec } from 'lib/shared/state-sync/state-sync-spec.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { Viewer } from '../../session/viewer.js';

export type ServerStateSyncSpec<Infos, Info = empty> = {
  +fetch: (
    viewer: Viewer,
    calendarQuery: $ReadOnlyArray<CalendarQuery>,
    ids?: $ReadOnlySet<string>,
  ) => Promise<Infos>,
  ...StateSyncSpec<Infos, Info>,
};
