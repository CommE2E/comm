// @flow

import * as React from 'react';
import { createSelector } from 'reselect';

import { useENSNames } from '../hooks/ens-cache.js';
import SearchIndex from '../shared/search-index.js';
import type { Platform } from '../types/device-types.js';
import {
  type CalendarQuery,
  defaultCalendarQuery,
} from '../types/entry-types.js';
import type { CalendarFilter } from '../types/filter-types.js';
import type {
  ThreadInfo,
  RelativeMemberInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { threadTypeIsPrivate } from '../types/thread-types-enum.js';
import type { UserInfo } from '../types/user-types.js';
import { getConfig } from '../utils/config.js';
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
  state: BaseAppState<>,
) => (calendarActive: boolean) => CalendarQuery = createSelector(
  (state: BaseAppState<>) => state.entryStore.lastUserInteractionCalendar,
  (state: BaseAppState<>) => state.navInfo,
  (state: BaseAppState<>) => state.calendarFilters,
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

// Without allAtOnce, useThreadSearchIndex and useUserSearchIndex are very
// expensive. useENSNames would trigger their recalculation for each ENS name
// as it streams in, but we would prefer to trigger their recaculation just
// once for every update of the underlying Redux data.
const useENSNamesOptions = { allAtOnce: true };

function useUserSearchIndex(
  userInfos: $ReadOnlyArray<UserInfo | RelativeMemberInfo>,
): SearchIndex {
  const membersWithENSNames = useENSNames(userInfos, useENSNamesOptions);

  const memberMap = React.useMemo(() => {
    const result = new Map<string, UserInfo | RelativeMemberInfo>();
    for (const userInfo of membersWithENSNames) {
      result.set(userInfo.id, userInfo);
    }
    return result;
  }, [membersWithENSNames]);

  return React.useMemo(() => {
    const searchIndex = new SearchIndex();

    for (const userInfo of userInfos) {
      const searchTextArray = [];

      const rawUsername = userInfo.username;
      if (rawUsername) {
        searchTextArray.push(rawUsername);
      }

      const resolvedUserInfo = memberMap.get(userInfo.id);
      const resolvedUsername = resolvedUserInfo?.username;
      if (resolvedUsername && resolvedUsername !== rawUsername) {
        searchTextArray.push(resolvedUsername);
      }

      searchIndex.addEntry(userInfo.id, searchTextArray.join(' '));
    }

    return searchIndex;
  }, [userInfos, memberMap]);
}

function useThreadSearchIndex(
  threadInfos: $ReadOnlyArray<RawThreadInfo | ThreadInfo>,
): SearchIndex {
  const userInfos = useSelector(state => state.userStore.userInfos);
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const nonViewerMembers = React.useMemo(() => {
    const allMembersOfAllThreads = new Map<string, UserInfo>();
    for (const threadInfo of threadInfos) {
      for (const member of threadInfo.members) {
        if (!member.role || member.id === viewerID) {
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

  const nonViewerMembersWithENSNames = useENSNames(
    nonViewerMembers,
    useENSNamesOptions,
  );

  const memberMap = React.useMemo(() => {
    const result = new Map<string, UserInfo>();
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
        if (
          !member.role ||
          (member.id === viewerID && !threadTypeIsPrivate(threadInfo.type))
        ) {
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

export {
  timeUntilCalendarRangeExpiration,
  currentCalendarQuery,
  useUserSearchIndex,
  useThreadSearchIndex,
};
