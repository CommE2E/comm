// @flow

import type { EntryInfo } from 'lib/types/entry-types';

import { currentDaysToEntries } from 'lib/selectors/calendar-selectors';

import { createSelector } from 'reselect';
import _map from 'lodash/fp/map';
const _mapWithKeys = _map.convert({ cap: false });

export type CalendarItem =
  {
    itemType: "entryInfo",
    entryInfo: EntryInfo,
  } | {
    itemType: "footer",
    dateString: string,
  };

const calendarSectionListData = createSelector(
  currentDaysToEntries,
  (daysToEntries: {[dayString: string]: EntryInfo[]}) => _mapWithKeys(
    (entryInfos: EntryInfo[], dateString: string) => ({
      data: ([
        ..._map(
          (entryInfo: EntryInfo) => ({ itemType: "entryInfo", entryInfo }),
        )(entryInfos),
        { itemType: "footer", dateString: dateString },
      ]: CalendarItem[]),
      key: dateString,
    }),
  )(daysToEntries),
);

export {
  calendarSectionListData,
};
