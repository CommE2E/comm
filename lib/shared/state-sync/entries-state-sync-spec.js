// @flow

import _isEqual from 'lodash/fp/isEqual.js';
import { createSelector } from 'reselect';
import t from 'tcomb';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type CalendarQuery,
  type RawEntryInfos,
  rawEntryInfoValidator,
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
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { values, combineUnorderedHashes, hash } from '../../utils/objects.js';
import { generateReportID } from '../../utils/report-utils.js';
import { sanitizeActionSecrets } from '../../utils/sanitization.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../entry-utils.js';

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
  convertClientToServerInfos(
    infos: RawEntryInfos,
    calendarQuery: CalendarQuery,
  ) {
    const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
      serverEntryInfosObject(values(infos)),
      calendarQuery,
    );

    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      t.dict(tID, rawEntryInfoValidator),
      filteredEntryInfos,
    );
  },
  findStoreInconsistencies(
    action: ProcessServerRequestAction,
    beforeStateCheck: RawEntryInfos,
    afterStateCheck: RawEntryInfos,
  ) {
    const calendarQuery = action.payload.calendarQuery;
    // We don't want to bother reporting an inconsistency if it's just because
    // of extraneous EntryInfos (not within the current calendarQuery) on either
    // side
    const filteredBeforeResult = filterRawEntryInfosByCalendarQuery(
      serverEntryInfosObject(values(beforeStateCheck)),
      calendarQuery,
    );
    const filteredAfterResult = filterRawEntryInfosByCalendarQuery(
      serverEntryInfosObject(values(afterStateCheck)),
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
  selector: createSelector(
    (state: AppState) => state.entryStore.entryInfos,
    entryInfos => ({
      ...entriesStateSyncSpec,
      getInfoHash: id => hash(entryInfos[`${ashoatKeyserverID}|${id}`]),
      getAllInfosHash: calendarQuery =>
        getEntryInfosHash(entryInfos, calendarQuery),
      getIDs: calendarQuery => getEntryIDs(entryInfos, calendarQuery),
    }),
  ),
});

const emptyArray = [];

function getEntryInfosHash(
  entryInfos: RawEntryInfos,
  calendarQuery: CalendarQuery,
) {
  const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(entryInfos)),
    calendarQuery,
  );

  return combineUnorderedHashes(Object.values(filteredEntryInfos).map(hash));
}

function getEntryIDs(entryInfos: RawEntryInfos, calendarQuery: CalendarQuery) {
  const filteredEntryInfos = filterRawEntryInfosByCalendarQuery(
    serverEntryInfosObject(values(entryInfos)),
    calendarQuery,
  );

  return Object.keys(filteredEntryInfos).map(id => id.split('|')[1]);
}
