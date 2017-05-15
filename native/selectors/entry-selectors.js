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
    itemType: "loader",
    key: string,
  } | {
    itemType: "header",
    dateString: string,
  } | {
    itemType: "entryInfo",
    entryInfo: EntryInfo,
  } | {
    itemType: "footer",
    dateString: string,
  };

const calendarListData = createSelector(
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
    const items: CalendarItem[] = [{ itemType: "loader", key: "TopLoader" }];
    for (let dayString in daysToEntries) {
      items.push({ itemType: "header", dateString: dayString });
      for (let entryInfo of daysToEntries[dayString]) {
        items.push({ itemType: "entryInfo", entryInfo });
      }
      items.push({ itemType: "footer", dateString: dayString });
    }
    items.push({ itemType: "loader", key: "BottomLoader" });
    return items;
  },
);

export {
  calendarListData,
};
