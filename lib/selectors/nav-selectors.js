// @flow

import type { BaseAppState } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { RawThreadInfo } from '../types/thread-types';
import { type CalendarQuery, defaultCalendarQuery } from '../types/entry-types';
import type { UserInfo } from '../types/user-types';
import type { CalendarFilter } from '../types/filter-types';
import type { Platform } from '../types/device-types';

import { createSelector } from 'reselect';

import { getConfig } from '../utils/config';
import SearchIndex from '../shared/search-index';

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

const threadSearchText = (
  threadInfo: RawThreadInfo,
  userInfos: { [id: string]: UserInfo },
): string => {
  const searchTextArray = [];
  if (threadInfo.name) {
    searchTextArray.push(threadInfo.name);
  }
  if (threadInfo.description) {
    searchTextArray.push(threadInfo.description);
  }
  for (let member of threadInfo.members) {
    const userInfo = userInfos[member.id];
    if (userInfo && userInfo.username) {
      searchTextArray.push(userInfo.username);
    }
  }
  return searchTextArray.join(' ');
};

const threadSearchIndex: (
  state: BaseAppState<*>,
) => SearchIndex = createSelector(
  (state: BaseAppState<*>) => state.threadStore.threadInfos,
  (state: BaseAppState<*>) => state.userStore.userInfos,
  (
    threadInfos: { [id: string]: RawThreadInfo },
    userInfos: { [id: string]: UserInfo },
  ) => {
    const searchIndex = new SearchIndex();
    for (const threadID in threadInfos) {
      const thread = threadInfos[threadID];
      searchIndex.addEntry(threadID, threadSearchText(thread, userInfos));
    }
    return searchIndex;
  },
);

export {
  timeUntilCalendarRangeExpiration,
  currentCalendarQuery,
  threadSearchIndex,
};
