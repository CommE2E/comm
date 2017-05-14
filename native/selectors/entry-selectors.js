// @flow

import type { BaseAppState } from 'lib/types/redux-types';
import type { EntryInfo } from 'lib/types/entry-types';

import { createSelector } from 'reselect';
import _map from 'lodash/fp/map';
const _mapWithKeys = _map.convert({ cap: false });
import invariant from 'invariant';

import { currentDaysToEntries } from 'lib/selectors/calendar-selectors';
import { dateString } from 'lib/utils/date-utils';

export type CalendarItem =
  {
    itemType: "entryInfo",
    entryInfo: EntryInfo,
  } | {
    itemType: "footer",
    dateString: string,
  };

const calendarSectionListData = createSelector(
  (state: BaseAppState) => !!state.userInfo,
  currentDaysToEntries,
  (
    loggedIn: bool,
    daysToEntries: {[dayString: string]: EntryInfo[]},
  ) => {
    if (!loggedIn) {
      return null;
    }
    invariant(
      daysToEntries[dateString(new Date())] !== undefined,
      "today should have an entry in currentDaysToEntries on native",
    );
    const result = _mapWithKeys(
      (entryInfos: EntryInfo[], dayString: string) => ({
        data: ([
          ..._map(
            (entryInfo: EntryInfo) => ({ itemType: "entryInfo", entryInfo }),
          )(entryInfos),
          { itemType: "footer", dateString: dayString },
        ]: CalendarItem[]),
        key: dayString,
      }),
    )(daysToEntries);
    return [
      { data: [], key: "TopLoader" },
      ...result,
      { data: [], key: "BottomLoader" },
    ];
  },
);

export {
  calendarSectionListData,
};
