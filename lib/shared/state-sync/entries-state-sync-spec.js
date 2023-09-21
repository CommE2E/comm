// @flow

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
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { values, combineUnorderedHashes, hash } from '../../utils/objects.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../entry-utils.js';

export const entriesStateSyncSpec: StateSyncSpec<RawEntryInfos, RawEntryInfo> =
  Object.freeze({
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
