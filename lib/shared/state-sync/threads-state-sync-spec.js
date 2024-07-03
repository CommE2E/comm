// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import _pickBy from 'lodash/fp/pickBy.js';
import { createSelector } from 'reselect';

import type { StateSyncSpec, BoundStateSyncSpec } from './state-sync-spec.js';
import { extractKeyserverIDFromIDOptional } from '../../keyserver-conn/keyserver-call-utils.js';
import type { CalendarQuery } from '../../types/entry-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { AppState } from '../../types/redux-types.js';
import {
  reportTypes,
  type ClientThreadInconsistencyReportCreationRequest,
} from '../../types/report-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';
import {
  type MixedRawThreadInfos,
  type LegacyRawThreadInfo,
} from '../../types/thread-types.js';
import { actionLogger } from '../../utils/action-logger.js';
import { getConfig } from '../../utils/config.js';
import { combineUnorderedHashes, entries } from '../../utils/objects.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';

const selector: (
  state: AppState,
) => BoundStateSyncSpec<
  MixedRawThreadInfos,
  LegacyRawThreadInfo | RawThreadInfo,
  $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
> = createSelector(
  (state: AppState) => state.integrityStore.threadHashes,
  (state: AppState) => state.integrityStore.threadHashingStatus === 'completed',
  (threadHashes: { +[string]: number }, threadHashingComplete: boolean) => ({
    ...threadsStateSyncSpec,
    getInfoHash: (id: string, keyserverID: string) =>
      threadHashes[`${keyserverID}|${id}`],
    getAllInfosHash: threadHashingComplete
      ? (query: CalendarQuery, keyserverID: string) =>
          combineUnorderedHashes(
            entries(threadHashes)
              .filter(
                ([id]) => extractKeyserverIDFromIDOptional(id) === keyserverID,
              )
              .map(([, threadHash]) => threadHash),
          )
      : () => null,
    getIDs: threadHashingComplete
      ? (query: CalendarQuery, keyserverID: string) =>
          Object.keys(threadHashes)
            .filter(id => extractKeyserverIDFromIDOptional(id) === keyserverID)
            .map(id => id.split('|')[1])
      : () => null,
    canSyncState: () => threadHashingComplete,
  }),
);

export const threadsStateSyncSpec: StateSyncSpec<
  MixedRawThreadInfos,
  LegacyRawThreadInfo | RawThreadInfo,
  $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest>,
> = Object.freeze({
  hashKey: 'threadInfos',
  innerHashSpec: {
    hashKey: 'threadInfo',
    deleteKey: 'deleteThreadIDs',
    rawInfosKey: 'rawThreadInfos',
  },
  findStoreInconsistencies(
    action: ProcessServerRequestAction,
    beforeStateCheck: MixedRawThreadInfos,
    afterStateCheck: MixedRawThreadInfos,
  ) {
    const keyserverID = action.payload.keyserverID;
    const filter = _pickBy(
      thread => extractKeyserverIDFromIDOptional(thread.id) === keyserverID,
    );
    const filteredBeforeStateCheck = filter(beforeStateCheck);
    const filteredAfterStateCheck = filter(afterStateCheck);
    if (_isEqual(filteredBeforeStateCheck)(filteredAfterStateCheck)) {
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
  selector,
});

const emptyArray: $ReadOnlyArray<ClientThreadInconsistencyReportCreationRequest> =
  [];
