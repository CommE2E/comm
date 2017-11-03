// @flow

import type { BaseAppState } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { ThreadInfo } from '../types/thread-types';
import { threadPermissions } from '../types/thread-types';

import { createSelector } from 'reselect';
import _some from 'lodash/fp/some';
import invariant from 'invariant';

import { fifteenDaysEarlier, fifteenDaysLater } from '../utils/date-utils';
import { getConfig } from '../utils/config';
import SearchIndex from '../shared/search-index';
import * as TypeaheadText from '../shared/typeahead-text';
import { threadHasPermission } from '../shared/thread-utils';

const subscriptionExists = createSelector(
  (state: BaseAppState) => state.threadInfos,
  (threadInfos: {[id: string]: ThreadInfo}) =>
    _some('currentUserRole.subscribed')(threadInfos),
);

// never returns null; appropriate to use with server APIs
const simpleNavID = createSelector(
  (state: BaseAppState) => state.navInfo,
  (navInfo: BaseNavInfo) => {
    if (navInfo.home) {
      return "home";
    }
    invariant(navInfo.threadID, "either home or threadID should be set");
    return navInfo.threadID;
  },
);

const currentNavID = createSelector(
  (state: BaseAppState) => state.navInfo,
  (state: BaseAppState) => state.threadInfos,
  subscriptionExists,
  (
    navInfo: BaseNavInfo,
    threadInfos: {[id: string]: ThreadInfo},
    subscriptionExists: bool,
  ) => {
    if (navInfo.home) {
      return subscriptionExists ? "home" : null;
    }
    invariant(navInfo.threadID, "either home or threadID should be set");
    const threadInfo = threadInfos[navInfo.threadID];
    if (
      !threadInfo ||
      !threadHasPermission(threadInfo, threadPermissions.VISIBLE)
    ) {
      return null;
    }
    return navInfo.threadID;
  },
);

function calendarRangeExpired(lastUserInteractionCalendar: number): bool {
  const calendarRangeInactivityLimit = getConfig().calendarRangeInactivityLimit;
  return !!calendarRangeInactivityLimit &&
    (Date.now() - lastUserInteractionCalendar) > calendarRangeInactivityLimit;
}

function currentRequestNavID(
  lastUserInteractionCalendar: number,
  navInfo: BaseNavInfo,
): string {
  if (calendarRangeExpired(lastUserInteractionCalendar) || navInfo.home) {
    return "home";
  }
  invariant(navInfo.threadID, "should be set if home isn't");
  return navInfo.threadID;
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

export type CalendarQuery = {
  navID: string,
  startDate: string,
  endDate: string,
  includeDeleted?: bool,
};

const currentCalendarQuery = createSelector(
  (state: BaseAppState) => state.entryStore.lastUserInteractionCalendar,
  (state: BaseAppState) => state.navInfo,
  (lastUserInteractionCalendar: ?number, navInfo: BaseNavInfo) => {
    const lastUserInteractionCalendar2 = lastUserInteractionCalendar;
    invariant(
      lastUserInteractionCalendar2 !== undefined &&
        lastUserInteractionCalendar2 !== null,
      "calendar should have a lastUserInteraction entry",
    );
    // Return a function since we depend on the time of evaluation
    return (): CalendarQuery => ({
      navID: currentRequestNavID(lastUserInteractionCalendar2, navInfo),
      startDate: currentStartDate(
        lastUserInteractionCalendar2,
        navInfo.startDate,
      ),
      endDate: currentEndDate(lastUserInteractionCalendar2, navInfo.endDate),
    });
  },
);

const threadSearchIndex = createSelector(
  (state: BaseAppState) => state.threadInfos,
  subscriptionExists,
  currentNavID,
  (state: BaseAppState) => state.navInfo.threadID,
  (
    threadInfos: {[id: string]: ThreadInfo},
    subscriptionExists: bool,
    currentNavID: ?string,
    currentThreadID: ?string,
  ) => {
    const searchIndex = new SearchIndex();
    if (currentThreadID && !threadInfos[currentThreadID]) {
      searchIndex.addEntry(
        currentThreadID,
        TypeaheadText.secretText,
      );
    }
    searchIndex.addEntry("home", TypeaheadText.homeText);
    for (const threadID in threadInfos) {
      const thread = threadInfos[threadID];
      searchIndex.addEntry(
        threadID,
        thread.name + " " + thread.description,
      );
    }
    searchIndex.addEntry("new", TypeaheadText.newText);
    return searchIndex;
  },
);

export {
  subscriptionExists,
  simpleNavID,
  currentNavID,
  currentCalendarQuery,
  threadSearchIndex,
};
