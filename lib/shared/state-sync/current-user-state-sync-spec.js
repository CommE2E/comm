// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec, BoundStateSyncSpec } from './state-sync-spec.js';
import type { CalendarQuery } from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types';
import { type CurrentUserInfo } from '../../types/user-types.js';
import { authoritativeKeyserverID } from '../../utils/authoritative-keyserver.js';
import { hash } from '../../utils/objects.js';

const selector: (
  state: AppState,
) => BoundStateSyncSpec<CurrentUserInfo, CurrentUserInfo, void> =
  createSelector(
    (state: AppState) => state.currentUserInfo,
    (currentUserInfo: ?CurrentUserInfo) => ({
      ...currentUserStateSyncSpec,
      getInfoHash: () => hash(currentUserInfo),
      getAllInfosHash: (query: CalendarQuery, keyserverID: string) => {
        if (keyserverID !== authoritativeKeyserverID()) {
          return null;
        }
        return hash(currentUserInfo);
      },
      getIDs: () => ([]: string[]),
      canSyncState: (keyserverID: string) =>
        keyserverID === authoritativeKeyserverID(),
    }),
  );

export const currentUserStateSyncSpec: StateSyncSpec<
  CurrentUserInfo,
  CurrentUserInfo,
  void,
> = Object.freeze({
  hashKey: 'currentUserInfo',
  findStoreInconsistencies() {
    return undefined;
  },
  selector,
});
