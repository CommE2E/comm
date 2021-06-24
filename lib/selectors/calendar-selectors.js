// @flow

import { createSelector } from 'reselect';

import { rawEntryInfoWithinActiveRange } from '../shared/entry-utils';
import SearchIndex from '../shared/search-index';
import { threadInFilterList } from '../shared/thread-utils';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types';
import { type FilterThreadInfo } from '../types/filter-types';
import type { BaseAppState } from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';
import { values } from '../utils/objects';
import { currentCalendarQuery } from './nav-selectors';
import { threadInfoSelector } from './thread-selectors';

const filterThreadInfos: (
  state: BaseAppState<*>,
) => (
  calendarActive: boolean,
) => $ReadOnlyArray<FilterThreadInfo> = createSelector(
  threadInfoSelector,
  currentCalendarQuery,
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (
    threadInfos: { +[id: string]: ThreadInfo },
    calendarQueryFunc: (calendarActive: boolean) => CalendarQuery,
    rawEntryInfos: { +[id: string]: RawEntryInfo },
  ) => (calendarActive: boolean) => {
    const calendarQuery = calendarQueryFunc(calendarActive);
    const result: { [threadID: string]: FilterThreadInfo } = {};
    for (const entryID in rawEntryInfos) {
      const rawEntryInfo = rawEntryInfos[entryID];
      if (!rawEntryInfoWithinActiveRange(rawEntryInfo, calendarQuery)) {
        continue;
      }
      const threadID = rawEntryInfo.threadID;
      const threadInfo = threadInfos[rawEntryInfo.threadID];
      if (!threadInFilterList(threadInfo)) {
        continue;
      }
      if (result[threadID]) {
        result[threadID].numVisibleEntries++;
      } else {
        result[threadID] = {
          threadInfo,
          numVisibleEntries: 1,
        };
      }
    }
    for (const threadID in threadInfos) {
      const threadInfo = threadInfos[threadID];
      if (!result[threadID] && threadInFilterList(threadInfo)) {
        result[threadID] = {
          threadInfo,
          numVisibleEntries: 0,
        };
      }
    }
    return values(result).sort(
      (first: FilterThreadInfo, second: FilterThreadInfo) =>
        second.numVisibleEntries - first.numVisibleEntries,
    );
  },
);

const filterThreadSearchIndex: (
  state: BaseAppState<*>,
) => (calendarActive: boolean) => SearchIndex = createSelector(
  filterThreadInfos,
  (
    threadInfoFunc: (
      calendarActive: boolean,
    ) => $ReadOnlyArray<FilterThreadInfo>,
  ) => (calendarActive: boolean) => {
    const threadInfos = threadInfoFunc(calendarActive);
    const searchIndex = new SearchIndex();
    for (const filterThreadInfo of threadInfos) {
      const { threadInfo } = filterThreadInfo;
      searchIndex.addEntry(threadInfo.id, threadInfo.uiName);
    }
    return searchIndex;
  },
);

export { filterThreadInfos, filterThreadSearchIndex };
