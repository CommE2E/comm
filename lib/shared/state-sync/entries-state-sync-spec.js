// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import { createSelector } from 'reselect';

import type { StateSyncSpec, BoundStateSyncSpec } from './state-sync-spec.js';
import { extractKeyserverIDFromIDOptional } from '../../keyserver-conn/keyserver-call-utils.js';
import {
  type CalendarQuery,
  type RawEntryInfos,
  type RawEntryInfo,
} from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types.js';
import {
  reportTypes,
  type ClientEntryInconsistencyReportCreationRequest,
} from '../../types/report-types.js';
import type { ProcessServerRequestAction } from '../../types/request-types.js';
import { actionLogger } from '../../utils/action-logger.js';
import { getConfig } from '../../utils/config.js';
import { values, combineUnorderedHashes, hash } from '../../utils/objects.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../entry-utils.js';

const selector: (
  state: AppState,
) => BoundStateSyncSpec<
  RawEntryInfos,
  RawEntryInfo,
  $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>,
> = createSelector(
  (state: AppState) => state.entryStore.entryInfos,
  (entryInfos: RawEntryInfos) => ({
    ...entriesStateSyncSpec,
    getInfoHash: (id: string, keyserverID: string) =>
      hash(entryInfos[`${keyserverID}|${id}`]),
    getAllInfosHash: (calendarQuery: CalendarQuery, keyserverID: string) =>
      getEntryInfosHash(entryInfos, calendarQuery, keyserverID),
    getIDs: (calendarQuery: CalendarQuery, keyserverID: string) =>
      getEntryIDs(entryInfos, calendarQuery, keyserverID),
    canSyncState: () => true,
  }),
);

export const entriesStateSyncSpec: StateSyncSpec<
  RawEntryInfos,
  RawEntryInfo,
  $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest>,
> = Object.freeze({
  hashKey: 'entryInfos',
  innerHashSpec: {
    hashKey: 'entryInfo',
    deleteKey: 'deleteEntryIDs',
    rawInfosKey: 'rawEntryInfos',
  },
  findStoreInconsistencies(
    action: ProcessServerRequestAction,
    beforeStateCheck: RawEntryInfos,
    afterStateCheck: RawEntryInfos,
  ) {
    const keyserverID = action.payload.keyserverID;
    const filteredBeforeStateCheck = values(beforeStateCheck).filter(
      entry =>
        entry.id && extractKeyserverIDFromIDOptional(entry.id) === keyserverID,
    );
    const filteredAfterStateCheck = values(afterStateCheck).filter(
      entry =>
        entry.id && extractKeyserverIDFromIDOptional(entry.id) === keyserverID,
    );

    const calendarQuery = action.payload.calendarQuery;
    // We don't want to bother reporting an inconsistency if it's just because
    // of extraneous EntryInfos (not within the current calendarQuery) on either
    // side
    const filteredBeforeResult = filterRawEntryInfosByCalendarQuery(
      serverEntryInfosObject(filteredBeforeStateCheck),
      calendarQuery,
    );
    const filteredAfterResult = filterRawEntryInfosByCalendarQuery(
      serverEntryInfosObject(filteredAfterStateCheck),
      calendarQuery,
    );
    if (_isEqual(filteredBeforeResult)(filteredAfterResult)) {
      return emptyArray;
    }
    return [
      {
        type: reportTypes.ENTRY_INCONSISTENCY,
        platformDetails: getConfig().platformDetails,
        beforeAction: beforeStateCheck,
        action: sanitizeActionSecrets(action),
        calendarQuery,
        pushResult: afterStateCheck,
        lastActions: actionLogger.interestingActionSummaries,
        time: Date.now(),
        id: generateReportID(),
      },
    ];
  },
  selector,
});

const emptyArray: $ReadOnlyArray<ClientEntryInconsistencyReportCreationRequest> =
  [];

function getEntryInfosHash(
  entryInfos: RawEntryInfos,
  calendarQuery: CalendarQuery,
  keyserverID: string,
) {
  const filteredEntries = values(entryInfos).filter(
    entry =>
      entry.id && extractKeyserverIDFromIDOptional(entry.id) === keyserverID,
  );
  const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(filteredEntries),
    calendarQuery,
  );

  return combineUnorderedHashes(Object.values(filteredEntryInfos).map(hash));
}

function getEntryIDs(
  entryInfos: RawEntryInfos,
  calendarQuery: CalendarQuery,
  keyserverID: string,
) {
  const filteredEntries = values(entryInfos).filter(
    entry =>
      entry.id && extractKeyserverIDFromIDOptional(entry.id) === keyserverID,
  );
  const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(filteredEntries),
    calendarQuery,
  );

  return Object.keys(filteredEntryInfos).map(id => id.split('|')[1]);
}
