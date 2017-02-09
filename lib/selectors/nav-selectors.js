// @flow

import type { BaseAppState } from '../types/redux-types';
import type { BaseNavInfo } from '../types/nav-types';
import type { CalendarInfo } from '../types/calendar-types';

import { createSelector } from 'reselect';
import _ from 'lodash';
import invariant from 'invariant';

const subscriptionExists = createSelector(
  (state: BaseAppState) => state.calendarInfos,
  (calendarInfos: {[id: string]: CalendarInfo}) =>
    _.some(calendarInfos, 'subscribed'),
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

export {
  subscriptionExists,
  currentNavID,
};
