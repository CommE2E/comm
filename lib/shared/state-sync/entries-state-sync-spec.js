// @flow

import t from 'tcomb';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type CalendarQuery,
  type RawEntryInfos,
  rawEntryInfoValidator,
} from '../../types/entry-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { values } from '../../utils/objects.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';
import {
  filterRawEntryInfosByCalendarQuery,
  serverEntryInfosObject,
} from '../entry-utils.js';

export const entriesStateSyncSpec: StateSyncSpec<RawEntryInfos> = Object.freeze(
  {
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
  },
);
