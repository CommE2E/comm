// @flow

import type { EntryInfo } from 'lib/types/entry-types';

import { currentDaysToEntries } from 'lib/selectors/calendar-selectors';

import { createSelector } from 'reselect';
import _map from 'lodash/fp/map';
const _mapWithKeys = _map.convert({ cap: false });

export type CalendarItem = {
  entryInfo?: EntryInfo,
  footerForDateString?: string,
};

const calendarSectionListData = createSelector(
  currentDaysToEntries,
  (daysToEntries: {[dayString: string]: EntryInfo[]}) => _mapWithKeys(
    (entryInfos: EntryInfo[], dateString: string) => ({
      data: ([
        ..._map((entryInfo: EntryInfo) => ({ entryInfo }))(entryInfos),
        { footerForDateString: dateString },
      ]: CalendarItem[]),
      key: dateString,
    }),
  )(daysToEntries),
);

export {
  calendarSectionListData,
};
