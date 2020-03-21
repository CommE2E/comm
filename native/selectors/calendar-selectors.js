// @flow

import type { EntryInfo } from 'lib/types/entry-types';
import type { AppState } from '../redux/redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';

import { createSelector } from 'reselect';

import {
  currentDaysToEntries,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors';
import { dateString } from 'lib/utils/date-utils';

export type SectionHeaderItem = {|
  itemType: 'header',
  dateString: string,
|};
export type SectionFooterItem = {|
  itemType: 'footer',
  dateString: string,
|};
export type LoaderItem = {|
  itemType: 'loader',
  key: string,
|};
export type CalendarItem =
  | LoaderItem
  | SectionHeaderItem
  | SectionFooterItem
  | {|
      itemType: 'entryInfo',
      entryInfo: EntryInfo,
      threadInfo: ThreadInfo,
    |};

const calendarListData: (state: AppState) => ?(CalendarItem[]) = createSelector(
  (state: AppState) =>
    !!(state.currentUserInfo && !state.currentUserInfo.anonymous && true),
  currentDaysToEntries,
  threadInfoSelector,
  (
    loggedIn: boolean,
    daysToEntries: { [dayString: string]: EntryInfo[] },
    threadInfos: { [id: string]: ThreadInfo },
  ) => {
    if (!loggedIn || daysToEntries[dateString(new Date())] === undefined) {
      return null;
    }
    const items: CalendarItem[] = [{ itemType: 'loader', key: 'TopLoader' }];
    for (let dayString in daysToEntries) {
      items.push({ itemType: 'header', dateString: dayString });
      for (let entryInfo of daysToEntries[dayString]) {
        const threadInfo = threadInfos[entryInfo.threadID];
        if (threadInfo) {
          items.push({ itemType: 'entryInfo', entryInfo, threadInfo });
        }
      }
      items.push({ itemType: 'footer', dateString: dayString });
    }
    items.push({ itemType: 'loader', key: 'BottomLoader' });
    return items;
  },
);

export { calendarListData };
