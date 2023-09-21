// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import type { AppState } from '../../types/redux-types';
import {
  type CurrentUserInfo,
  currentUserInfoValidator,
} from '../../types/user-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { hash } from '../../utils/objects.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const currentUserStateSyncSpec: StateSyncSpec<
  CurrentUserInfo,
  CurrentUserInfo,
> = Object.freeze({
  hashKey: 'currentUserInfo',
  convertClientToServerInfos(info: CurrentUserInfo) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      currentUserInfoValidator,
      info,
    );
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
