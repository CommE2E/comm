// @flow

import type { CalendarQuery } from '../../types/entry-types.js';

export type StateSyncSpec<Infos, Info> = {
  +hashKey: string,
  +innerHashSpec?: {
    +hashKey: string,
    +deleteKey: string,
    +rawInfosKey: string,
    +additionalDeleteCondition?: Info => boolean,
  },
  +convertClientToServerInfos: (
    infos: Infos,
    calendarQuery: CalendarQuery,
  ) => Infos,
};
