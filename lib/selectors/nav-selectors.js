// @flow

import type { BaseAppState } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { CalendarInfo } from '../types/calendar-types';

import { createSelector } from 'reselect';
import _some from 'lodash/fp/some';
import invariant from 'invariant';

import { fifteenDaysEarlier, fifteenDaysLater } from '../utils/date-utils';
import { getConfig } from '../utils/config';

const subscriptionExists = createSelector(
  (state: BaseAppState) => state.calendarInfos,
  (calendarInfos: {[id: string]: CalendarInfo}) =>
    _some('subscribed')(calendarInfos),
);

// never returns null; appropriate to use with server APIs
const simpleNavID = createSelector(
  (state: BaseAppState) => state.navInfo,
  (navInfo: BaseNavInfo) => {
    if (navInfo.home) {
      return "home";
    }
    invariant(navInfo.calendarID, "either home or calendarID should be set");
    return navInfo.calendarID;
  },
);

const currentNavID = createSelector(
  (state: BaseAppState) => state.navInfo,
  (state: BaseAppState) => state.calendarInfos,
  subscriptionExists,
  (
    navInfo: BaseNavInfo,
    calendarInfos: {[id: string]: CalendarInfo},
    subscriptionExists: bool,
  ) => {
    if (navInfo.home) {
      return subscriptionExists ? "home" : null;
    }
    invariant(navInfo.calendarID, "either home or calendarID should be set");
    const calendarInfo = calendarInfos[navInfo.calendarID];
    if (!calendarInfo || !calendarInfo.authorized) {
      return null;
    }
    return navInfo.calendarID;
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
  invariant(navInfo.calendarID, "should be set if home isn't");
  return navInfo.calendarID;
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
  (state: BaseAppState) => state.lastUserInteraction.calendar,
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

export {
  subscriptionExists,
  simpleNavID,
  currentNavID,
  currentCalendarQuery,
};
