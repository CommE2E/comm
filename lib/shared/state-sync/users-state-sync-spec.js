// @flow

import _isEqual from 'lodash/fp/isEqual.js';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  reportTypes,
  type UserInconsistencyReportCreationRequest,
} from '../../types/report-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';
import {
  type UserInfo,
  type UserInfos,
  userInfosValidator,
} from '../../types/user-types.js';
import { actionLogger } from '../../utils/action-logger.js';
import { getConfig } from '../../utils/config.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const usersStateSyncSpec: StateSyncSpec<
  UserInfos,
  UserInfo,
  Array<UserInconsistencyReportCreationRequest>,
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
  convertClientToServerInfos(infos: UserInfos) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      userInfosValidator,
      infos,
    );
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
});

const emptyArray = [];
