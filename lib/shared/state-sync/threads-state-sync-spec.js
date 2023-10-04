// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import t from 'tcomb';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  reportTypes,
  type ClientThreadInconsistencyReportCreationRequest,
} from '../../types/report-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';
import {
  type RawThreadInfos,
  type RawThreadInfo,
  rawThreadInfoValidator,
} from '../../types/thread-types.js';
import { actionLogger } from '../../utils/action-logger.js';
import { getConfig } from '../../utils/config.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: StateSyncSpec<
  RawThreadInfos,
  RawThreadInfo,
  Array<ClientThreadInconsistencyReportCreationRequest>,
> = Object.freeze({
  hashKey: 'threadInfos',
  innerHashSpec: {
    hashKey: 'threadInfo',
    deleteKey: 'deleteThreadIDs',
    rawInfosKey: 'rawThreadInfos',
  },
  convertClientToServerInfos(infos: RawThreadInfos) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      t.dict(tID, rawThreadInfoValidator),
      infos,
    );
  },
  findStoreInconsistencies(
    action: ProcessServerRequestAction,
    beforeStateCheck: RawThreadInfos,
    afterStateCheck: RawThreadInfos,
  ) {
    if (_isEqual(beforeStateCheck)(afterStateCheck)) {
      return emptyArray;
    }
    return [
      {
        type: reportTypes.THREAD_INCONSISTENCY,
        platformDetails: getConfig().platformDetails,
        beforeAction: beforeStateCheck,
        action: sanitizeActionSecrets(action),
        pushResult: afterStateCheck,
        lastActions: actionLogger.interestingActionSummaries,
        time: Date.now(),
        id: generateReportID(),
      },
    ];
  },
});

const emptyArray = [];
