// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import type { AppState } from '../redux-setup';

import { createSelector } from 'reselect';
import _map from 'lodash/fp/map';
const _mapWithKeys = _map.convert({ cap: false });
import invariant from 'invariant';

import { currentDaysToEntries } from 'lib/selectors/thread-selectors';
import { dateString } from 'lib/utils/date-utils';

export type SectionHeaderItem = {|
  itemType: "header",
  dateString: string,
|};
export type SectionFooterItem = {|
  itemType: "footer",
  dateString: string,
|};
export type LoaderItem = {|
  itemType: "loader",
  key: string,
|};
export type CalendarItem =
  | LoaderItem
  | SectionHeaderItem
  | SectionFooterItem
  | {|
      itemType: "entryInfo",
      entryInfo: EntryInfo,
    |};

const calendarListData = createSelector(
  (state: AppState) => !!(state.currentUserInfo &&
    !state.currentUserInfo.anonymous && true),
  currentDaysToEntries,
  (
    loggedIn: bool,
    daysToEntries: {[dayString: string]: EntryInfo[]},
  ) => {
    if (!loggedIn || daysToEntries[dateString(new Date())] === undefined) {
      return null;
    }
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
