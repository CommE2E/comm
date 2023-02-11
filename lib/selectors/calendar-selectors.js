// @flow

import * as React from 'react';

import { currentCalendarQuery } from './nav-selectors.js';
import { threadInfoSelector } from './thread-selectors.js';
import { rawEntryInfoWithinActiveRange } from '../shared/entry-utils.js';
import SearchIndex from '../shared/search-index.js';
import { threadInFilterList } from '../shared/thread-utils.js';
import type { FilterThreadInfo } from '../types/filter-types.js';
import { useResolvedThreadInfosObj } from '../utils/entity-helpers.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';

function useFilterThreadInfos(
  calendarActive: boolean,
): $ReadOnlyArray<FilterThreadInfo> {
  const unresolvedThreadInfos = useSelector(threadInfoSelector);
  const threadInfos = useResolvedThreadInfosObj(unresolvedThreadInfos);
  const rawEntryInfos = useSelector(state => state.entryStore.entryInfos);

  const calendarQueryFunc = useSelector(currentCalendarQuery);
  const calendarQuery = calendarQueryFunc(calendarActive);

  return React.useMemo(() => {
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
        result[threadID] = {
          ...result[threadID],
          numVisibleEntries: result[threadID].numVisibleEntries + 1,
        };
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
  }, [threadInfos, rawEntryInfos, calendarQuery]);
}

function useFilterThreadSearchIndex(calendarActive: boolean): SearchIndex {
  const threadInfos = useFilterThreadInfos(calendarActive);
  return React.useMemo(() => {
    const searchIndex = new SearchIndex();
    for (const filterThreadInfo of threadInfos) {
      const { threadInfo } = filterThreadInfo;
      searchIndex.addEntry(threadInfo.id, threadInfo.uiName);
    }
    return searchIndex;
  }, [threadInfos]);
}

export { useFilterThreadInfos, useFilterThreadSearchIndex };
