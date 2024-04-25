// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import { createSelector } from 'reselect';

import type { StateSyncSpec, BoundStateSyncSpec } from './state-sync-spec.js';
import type { CalendarQuery } from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types';
import {
  type ClientUserInconsistencyReportCreationRequest,
  reportTypes,
} from '../../types/report-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';
import { type UserInfo, type UserInfos } from '../../types/user-types.js';
import { actionLogger } from '../../utils/action-logger.js';
import { authoritativeKeyserverID } from '../../utils/authoritative-keyserver.js';
import { getConfig } from '../../utils/config.js';
import { combineUnorderedHashes, hash } from '../../utils/objects.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';

const selector: (
  state: AppState,
) => BoundStateSyncSpec<
  UserInfos,
  UserInfo,
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
> = createSelector(
  (state: AppState) => state.userStore.userInfos,
  (userInfos: UserInfos) => ({
    ...usersStateSyncSpec,
    getInfoHash: (id: string) => hash(userInfos[id]),
    getAllInfosHash: (query: CalendarQuery, keyserverID: string) => {
      if (keyserverID !== authoritativeKeyserverID()) {
        return null;
      }
      return combineUnorderedHashes(Object.values(userInfos).map(hash));
    },
    getIDs: (query: CalendarQuery, keyserverID: string) => {
      if (keyserverID !== authoritativeKeyserverID()) {
        return null;
      }
      return Object.keys(userInfos);
    },
    canSyncState: (keyserverID: string) =>
      keyserverID === authoritativeKeyserverID(),
  }),
);

export const usersStateSyncSpec: StateSyncSpec<
  UserInfos,
  UserInfo,
  $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest>,
> = Object.freeze({
  hashKey: 'userInfos',
  innerHashSpec: {
    hashKey: 'userInfo',
    deleteKey: 'deleteUserInfoIDs',
    rawInfosKey: 'userInfos',
    additionalDeleteCondition(user: UserInfo) {
      return !user.username;
    },
  },
  findStoreInconsistencies(
    action: ProcessServerRequestAction,
    beforeStateCheck: UserInfos,
    afterStateCheck: UserInfos,
  ) {
    if (_isEqual(beforeStateCheck)(afterStateCheck)) {
      return emptyArray;
    }
    return [
      {
        type: reportTypes.USER_INCONSISTENCY,
        platformDetails: getConfig().platformDetails,
        action: sanitizeActionSecrets(action),
        beforeStateCheck,
        afterStateCheck,
        lastActions: actionLogger.interestingActionSummaries,
        time: Date.now(),
        id: generateReportID(),
      },
    ];
  },
  selector,
});

const emptyArray: $ReadOnlyArray<ClientUserInconsistencyReportCreationRequest> =
  [];
