// @flow

import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { Viewer } from '../../session/viewer.js';

export type StateSyncSpec<Infos> = {
  +fetchAll: (
    viewer: Viewer,
    calendarQuery: $ReadOnlyArray<CalendarQuery>,
  ) => Promise<Infos>,
};
