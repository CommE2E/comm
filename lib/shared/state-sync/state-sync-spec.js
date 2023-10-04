// @flow

import type { CalendarQuery } from '../../types/entry-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';

export type StateSyncSpec<Infos, Info, Inconsistencies> = {
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
  +findStoreInconsistencies: (
    action: ProcessServerRequestAction,
    beforeStateCheck: Infos,
    afterStateCheck: Infos,
  ) => Inconsistencies,
};
