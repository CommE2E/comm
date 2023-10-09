// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types';
import { type CurrentUserInfo } from '../../types/user-types.js';
import { hash } from '../../utils/objects.js';

export const currentUserStateSyncSpec: StateSyncSpec<
  CurrentUserInfo,
  CurrentUserInfo,
  void,
> = Object.freeze({
  hashKey: 'currentUserInfo',
  findStoreInconsistencies() {
    return undefined;
  },
  selector: createSelector(
    (state: AppState) => state.currentUserInfo,
    currentUserInfo => ({
      ...currentUserStateSyncSpec,
      getInfoHash: () => hash(currentUserInfo),
      getAllInfosHash: () => hash(currentUserInfo),
      getIDs: () => [],
    }),
  ),
});
