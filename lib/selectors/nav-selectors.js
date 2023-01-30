// @flow

import * as React from 'react';
import { createSelector } from 'reselect';

import SearchIndex from '../shared/search-index';
import { threadSearchText } from '../shared/thread-utils';
import type { Platform } from '../types/device-types';
import { type CalendarQuery, defaultCalendarQuery } from '../types/entry-types';
import type { CalendarFilter } from '../types/filter-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { BaseAppState } from '../types/redux-types';
import type { RawThreadInfo, ThreadInfo } from '../types/thread-types';
import { getConfig } from '../utils/config';
import { values } from '../utils/objects';
import { useSelector } from '../utils/redux-utils';

function timeUntilCalendarRangeExpiration(
  lastUserInteractionCalendar: number,
): ?number {
  const inactivityLimit = getConfig().calendarRangeInactivityLimit;
  if (inactivityLimit === null || inactivityLimit === undefined) {
    return null;
  }
  return lastUserInteractionCalendar + inactivityLimit - Date.now();
}

function calendarRangeExpired(lastUserInteractionCalendar: number): boolean {
  const timeUntil = timeUntilCalendarRangeExpiration(
    lastUserInteractionCalendar,
  );
  if (timeUntil === null || timeUntil === undefined) {
    return false;
  }
  return timeUntil <= 0;
}

const currentCalendarQuery: (
  state: BaseAppState<*>,
) => (calendarActive: boolean) => CalendarQuery = createSelector(
  (state: BaseAppState<*>) => state.entryStore.lastUserInteractionCalendar,
  (state: BaseAppState<*>) => state.navInfo,
  (state: BaseAppState<*>) => state.calendarFilters,
  (
    lastUserInteractionCalendar: number,
    navInfo: BaseNavInfo,
    calendarFilters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    // Return a function since we depend on the time of evaluation
    return (calendarActive: boolean, platform: ?Platform): CalendarQuery => {
      if (calendarActive) {
        return {
          startDate: navInfo.startDate,
          endDate: navInfo.endDate,
          filters: calendarFilters,
        };
      }
      if (calendarRangeExpired(lastUserInteractionCalendar)) {
        return defaultCalendarQuery(platform);
      }
      return {
        startDate: navInfo.startDate,
        endDate: navInfo.endDate,
        filters: calendarFilters,
      };
    };
  },
);

function useThreadSearchIndex(
  threadInfos: $ReadOnlyArray<RawThreadInfo | ThreadInfo>,
): SearchIndex {
  const userInfos = useSelector(state => state.userStore.userInfos);
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  return React.useMemo(() => {
    const searchIndex = new SearchIndex();
    for (const threadInfo of threadInfos) {
      searchIndex.addEntry(
        threadInfo.id,
        threadSearchText(threadInfo, userInfos, viewerID),
      );
    }
    return searchIndex;
  }, [threadInfos, userInfos, viewerID]);
}

function useGlobalThreadSearchIndex(): SearchIndex {
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const threadInfosArray = React.useMemo(() => values(threadInfos), [
    threadInfos,
  ]);
  return useThreadSearchIndex(threadInfosArray);
}

export {
  timeUntilCalendarRangeExpiration,
  currentCalendarQuery,
  useThreadSearchIndex,
  useGlobalThreadSearchIndex,
};
