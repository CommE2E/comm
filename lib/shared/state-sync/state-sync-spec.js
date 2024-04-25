// @flow

import type { CalendarQuery } from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';

export type StateSyncSpec<Infos, Info, Inconsistencies> = {
  +hashKey: string,
  +innerHashSpec?: {
    +hashKey: string,
    +deleteKey: string,
    +rawInfosKey: string,
    +additionalDeleteCondition?: Info => boolean,
  },
  +findStoreInconsistencies: (
    action: ProcessServerRequestAction,
    beforeStateCheck: Infos,
    afterStateCheck: Infos,
  ) => Inconsistencies,
  +selector: (
    state: AppState,
  ) => BoundStateSyncSpec<Infos, Info, Inconsistencies>,
};

// All ids specified here (getInfoHash and getIDs) are server ids.
// E.g. in the case of threadStore or entryStore the keyserver prefix
// needs to be handled additionally
export type BoundStateSyncSpec<Infos, Info, Inconsistencies> = {
  // If these function depend on background hashing that is still not complete
  // they should return  null, to indicate that the hashes aren't available yet
  +getInfoHash: (id: string, keyserverID: string) => ?number,
  +getAllInfosHash: (query: CalendarQuery, keyserverID: string) => ?number,
  +getIDs: (query: CalendarQuery, keyserverID: string) => ?Array<string>,
  // This flag is used to check if we can sync the state.
  // Currently, there are two cases where we cant sync the state:
  // 1. When background thread hashing is still in progress
  // 2. When a non-authoritative keyserver attempts a state sync of UserStore
  // or CurrentUserInfo
  // If we can't do a state sync, we're informing a keyserver that all
  // the hashes are correct. Later, the keyserver will attempt a state sync
  // again.
  +canSyncState: (keyserverID: string) => boolean,
  ...StateSyncSpec<Infos, Info, Inconsistencies>,
};
