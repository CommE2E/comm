// @flow

import { createSelector } from 'reselect';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type CalendarQuery,
  type RawEntryInfos,
  type RawEntryInfo,
} from '../../types/entry-types.js';
import type { AppState } from '../../types/redux-types.js';
import { values, combineUnorderedHashes, hash } from '../../utils/objects.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../entry-utils.js';

export const entriesStateSyncSpec: StateSyncSpec<RawEntryInfo> = Object.freeze({
  hashKey: 'entryInfos',
  innerHashSpec: {
    hashKey: 'entryInfo',
    deleteKey: 'deleteEntryIDs',
    rawInfosKey: 'rawEntryInfos',
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
