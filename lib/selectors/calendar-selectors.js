// @flow

import type { BaseAppState } from '../types/redux-types';
import type { ThreadInfo } from '../types/thread-types';
import type { RawEntryInfo, CalendarQuery } from '../types/entry-types';
import { type FilterThreadInfo } from '../types/filter-types';

import { createSelector } from 'reselect';

import { threadInfoSelector } from './thread-selectors';
import { currentCalendarQuery } from './nav-selectors';
import { rawEntryInfoWithinActiveRange } from '../shared/entry-utils';
import { threadInFilterList } from '../shared/thread-utils';
import SearchIndex from '../shared/search-index';

const filterThreadInfos = createSelector(
  threadInfoSelector,
  currentCalendarQuery,
  (state: BaseAppState<*>) => state.entryStore.entryInfos,
  (
    threadInfos: {[id: string]: ThreadInfo},
    calendarQueryFunc: () => CalendarQuery,
    rawEntryInfos: {[id: string]: RawEntryInfo},
  ) => () => {
    const calendarQuery = calendarQueryFunc();
    const result: {[threadID: string]: FilterThreadInfo} = {};
    for (let entryID in rawEntryInfos) {
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
    for (let threadID in threadInfos) {
      const threadInfo = threadInfos[threadID];
      if (!result[threadID] && threadInFilterList(threadInfo)) {
        result[threadID] = {
          threadInfo,
          numVisibleEntries: 0,
        };
      }
    }
    const resultArray: FilterThreadInfo[] = (Object.values(result): any);
    return resultArray.sort(
      (first: FilterThreadInfo, second: FilterThreadInfo) =>
        second.numVisibleEntries - first.numVisibleEntries,
    );
  },
);

const filterThreadSearchIndex = createSelector(
  filterThreadInfos,
  (
    threadInfoFunc: () => $ReadOnlyArray<FilterThreadInfo>
  ) => () => {
    const threadInfos = threadInfoFunc();
    const searchIndex = new SearchIndex();
    for (const filterThreadInfo of threadInfos) {
      const { threadInfo } = filterThreadInfo;
      searchIndex.addEntry(threadInfo.id, threadInfo.uiName);
    }
    return searchIndex;
  },
);

export {
  filterThreadInfos,
  filterThreadSearchIndex,
};
