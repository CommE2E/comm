// @flow

import type { CalendarQuery } from 'lib/types/entry-types.js';

import type { Viewer } from '../../session/viewer.js';

export type StateSyncSpec<Infos, Info = empty> = {
  +fetch: (
    viewer: Viewer,
    calendarQuery: $ReadOnlyArray<CalendarQuery>,
    ids?: $ReadOnlySet<string>,
  ) => Promise<Infos>,
  +hashKey: string,
  +innerHashSpec?: {
    +hashKey: string,
    +deleteKey: string,
    +rawInfosKey: string,
    +additionalDeleteCondition?: Info => boolean,
  },
};
