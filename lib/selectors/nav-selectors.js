// @flow

import * as React from 'react';
import { createSelector } from 'reselect';

import { useENSNames } from '../hooks/ens-cache.js';
import SearchIndex from '../shared/search-index.js';
import { memberHasAdminPowers } from '../shared/thread-utils.js';
import type { Platform } from '../types/device-types.js';
import {
  type CalendarQuery,
  defaultCalendarQuery,
} from '../types/entry-types.js';
import type { CalendarFilter } from '../types/filter-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import type { RawThreadInfo, ThreadInfo } from '../types/thread-types.js';
import { getConfig } from '../utils/config.js';
import { values } from '../utils/objects.js';
import { useSelector } from '../utils/redux-utils.js';

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
  const nonViewerMembers = React.useMemo(() => {
    const allMembersOfAllThreads = new Map();
    for (const threadInfo of threadInfos) {
      for (const member of threadInfo.members) {
        const isParentAdmin = memberHasAdminPowers(member);
        if (!member.role && !isParentAdmin) {
          continue;
        }
        if (member.id === viewerID) {
          continue;
        }
        if (!allMembersOfAllThreads.has(member.id)) {
          const userInfo = userInfos[member.id];
          if (userInfo?.username) {
            allMembersOfAllThreads.set(member.id, userInfo);
          }
        }
      }
    }
    return [...allMembersOfAllThreads.values()];
  }, [threadInfos, userInfos, viewerID]);

  const nonViewerMembersWithENSNames = useENSNames(nonViewerMembers);
  const memberMap = React.useMemo(() => {
    const result = new Map();
    for (const userInfo of nonViewerMembersWithENSNames) {
      result.set(userInfo.id, userInfo);
    }
    return result;
  }, [nonViewerMembersWithENSNames]);

  return React.useMemo(() => {
    const searchIndex = new SearchIndex();
    for (const threadInfo of threadInfos) {
      const searchTextArray = [];
      if (threadInfo.name) {
        searchTextArray.push(threadInfo.name);
      }
      if (threadInfo.description) {
        searchTextArray.push(threadInfo.description);
      }
      for (const member of threadInfo.members) {
        const isParentAdmin = memberHasAdminPowers(member);
        if (!member.role && !isParentAdmin) {
          continue;
        }
        if (member.id === viewerID) {
          continue;
        }
        const userInfo = userInfos[member.id];
        const rawUsername = userInfo?.username;
        if (rawUsername) {
          searchTextArray.push(rawUsername);
        }
        const resolvedUserInfo = memberMap.get(member.id);
        const username = resolvedUserInfo?.username;
        if (username && username !== rawUsername) {
          searchTextArray.push(username);
        }
      }
      searchIndex.addEntry(threadInfo.id, searchTextArray.join(' '));
    }
    return searchIndex;
  }, [threadInfos, viewerID, userInfos, memberMap]);
}

function useGlobalThreadSearchIndex(): SearchIndex {
  const threadInfos = useSelector(state => state.threadStore.threadInfos);
  const threadInfosArray = React.useMemo(
    () => values(threadInfos),
    [threadInfos],
  );
  return useThreadSearchIndex(threadInfosArray);
}

export {
  timeUntilCalendarRangeExpiration,
  currentCalendarQuery,
  useThreadSearchIndex,
  useGlobalThreadSearchIndex,
};
