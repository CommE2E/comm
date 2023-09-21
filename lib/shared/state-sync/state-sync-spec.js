// @flow

import type { CalendarQuery } from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types.js';

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
  +selector: (state: AppState) => BoundStateSyncSpec<Infos, Info>,
};

// All ids specified here (getInfoHash and getIDs) are server ids.
// E.g. in the case of threadStore or entryStore the keyserver prefix
// needs to be handled additionaly
export type BoundStateSyncSpec<Infos, Info> = {
  // If these function depend on background hashing that is still not complete
  // they should return  null, to indicate that the hashes aren't available yet
  +getInfoHash: (id: string) => ?number,
  +getAllInfosHash: (query: CalendarQuery) => ?number,
  +getIDs: (query: CalendarQuery) => ?Array<string>,
  ...StateSyncSpec<Infos, Info>,
};
