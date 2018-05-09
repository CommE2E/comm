// @flow

import type { BaseAppState } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { RawThreadInfo } from '../types/thread-types';
import type { CalendarQuery } from '../types/entry-types';
import type { UserInfo } from '../types/user-types';
import type { CalendarFilter } from '../types/filter-types';

import { createSelector } from 'reselect';
import _some from 'lodash/fp/some';
import invariant from 'invariant';

import { threadPermissions } from '../types/thread-types';
import { fifteenDaysEarlier, fifteenDaysLater } from '../utils/date-utils';
import { getConfig } from '../utils/config';
import SearchIndex from '../shared/search-index';
import { threadHasPermission, viewerIsMember } from '../shared/thread-utils';
import {
  filteredThreadIDsSelector,
  nonThreadCalendarFiltersSelector,
} from './calendar-filter-selectors';

const membershipExists = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  (threadInfos: {[id: string]: RawThreadInfo}) =>
    _some(viewerIsMember)(threadInfos),
);

const nullState = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  membershipExists,
  filteredThreadIDsSelector,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    membershipExists: bool,
    threadIDs: ?Set<string>,
  ) => {
    if (!threadIDs || threadIDs.size === 0) {
      return !membershipExists;
    }
    for (let threadID of threadIDs) {
      const threadInfo = threadInfos[threadID];
      if (
        threadInfo &&
        threadHasPermission(threadInfo, threadPermissions.VISIBLE)
      ) {
        return true;
      }
    }
    return false;
  },
);

function calendarRangeExpired(lastUserInteractionCalendar: number): bool {
  const calendarRangeInactivityLimit = getConfig().calendarRangeInactivityLimit;
  return !!calendarRangeInactivityLimit &&
    (Date.now() - lastUserInteractionCalendar) > calendarRangeInactivityLimit;
}

function currentStartDate(
  lastUserInteractionCalendar: number,
  startDate: string,
): string {
  if (!calendarRangeExpired(lastUserInteractionCalendar)) {
    return startDate;
  }
  return fifteenDaysEarlier();
}

function currentEndDate(
  lastUserInteractionCalendar: number,
  endDate: string,
): string {
  if (!calendarRangeExpired(lastUserInteractionCalendar)) {
    return endDate;
  }
  return fifteenDaysLater();
}

const currentCalendarQuery = createSelector(
  (state: BaseAppState<*>) => state.entryStore.lastUserInteractionCalendar,
  (state: BaseAppState<*>) => state.navInfo,
  (state: BaseAppState<*>) => state.calendarFilters,
  (
    lastUserInteractionCalendar: ?number,
    navInfo: BaseNavInfo,
    calendarFilters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    const lastUserInteractionCalendar2 = lastUserInteractionCalendar;
    invariant(
      lastUserInteractionCalendar2 !== undefined &&
        lastUserInteractionCalendar2 !== null,
      "calendar should have a lastUserInteraction entry",
    );
    // Return a function since we depend on the time of evaluation
    return (): CalendarQuery => ({
      startDate: currentStartDate(
        lastUserInteractionCalendar2,
        navInfo.startDate,
      ),
      endDate: currentEndDate(lastUserInteractionCalendar2, navInfo.endDate),
      filters: calendarFilters,
    });
  },
);

const threadSearchText = (
  threadInfo: RawThreadInfo,
  userInfos: {[id: string]: UserInfo},
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
  return searchTextArray.join(" ");
}

const threadSearchIndex = createSelector(
  (state: BaseAppState<*>) => state.threadInfos,
  (state: BaseAppState<*>) => state.userInfos,
  (
    threadInfos: {[id: string]: RawThreadInfo},
    userInfos: {[id: string]: UserInfo},
  ) => {
    const searchIndex = new SearchIndex();
    for (const threadID in threadInfos) {
      const thread = threadInfos[threadID];
      searchIndex.addEntry(
        threadID,
        threadSearchText(thread, userInfos),
      );
    }
    return searchIndex;
  },
);

const nonThreadCalendarQuery = createSelector(
  currentCalendarQuery,
  nonThreadCalendarFiltersSelector,
  (
    calendarQuery: () => CalendarQuery,
    filters: $ReadOnlyArray<CalendarFilter>,
  ) => {
    return (): CalendarQuery => {
      const query = calendarQuery();
      return {
        startDate: query.startDate,
        endDate: query.endDate,
        filters,
      };
    };
  },
);

export {
  nullState,
  currentCalendarQuery,
  threadSearchIndex,
  nonThreadCalendarQuery,
};
